// @flow
import * as React from 'react';
import { getInstancesInLayoutForLayer } from '../Utils/Layout';
import { mapFor, mapVector } from '../Utils/MapFor';
import { SafeExtractor } from '../Utils/SafeExtractor';
import { serializeToJSObject } from '../Utils/Serializer';
import { type AiGeneratedEvent } from '../Utils/GDevelopServices/Generation';
import { renderNonTranslatedEventsAsText } from '../EventsSheet/EventsTree/TextRenderer';
import {
  addObjectUndeclaredVariables,
  addUndeclaredVariables,
  applyEventsChanges,
} from './ApplyEventsChanges';
import { isBehaviorDefaultCapability } from '../BehaviorsEditor/EnumerateBehaviorsMetadata';
import { Trans } from '@lingui/macro';
import Link from '../UI/Link';
import {
  hexNumberToRGBArray,
  rgbOrHexToHexNumber,
} from '../Utils/ColorTransformer';
import { type SimplifiedBehavior } from './SimplifiedProject/SimplifiedProject';
import { ColumnStackLayout } from '../UI/Layout';
import Text from '../UI/Text';
import { applyVariableChange } from './ApplyVariableChange';

const gd: libGDevelop = global.gd;

export type EditorFunctionCall = {|
  name: string,
  arguments: string,
  call_id: string,
|};

export type EditorFunctionCallResult =
  | {|
      status: 'working',
      call_id: string,
    |}
  | {|
      status: 'finished',
      call_id: string,
      success: boolean,
      output: any,
    |}
  | {|
      status: 'ignored',
      call_id: string,
    |};

export type EditorFunctionGenericOutput = {|
  success: boolean,
  message?: string,
  eventsForSceneNamed?: string,
  eventsAsText?: string,
  instancesForSceneNamed?: string,
  objectName?: string,
  behaviorName?: string,
  properties?: any,
  sharedProperties?: any,
  instances?: any,
  behaviors?: Array<SimplifiedBehavior>,
  animationNames?: string,
  generatedEventsErrorDiagnostics?: string,
  aiGeneratedEventId?: string,
|};

export type EventsGenerationResult =
  | {|
      generationCompleted: true,
      aiGeneratedEvent: AiGeneratedEvent,
    |}
  | {|
      generationCompleted: false,
      errorMessage: string,
    |};

export type EventsGenerationOptions = {|
  sceneName: string,
  eventsDescription: string,
  extensionNamesList: string,
  objectsList: string,
  existingEventsAsText: string,
  placementHint: string,
|};

export type AssetSearchAndInstallResult = {|
  status: 'asset-installed' | 'nothing-found' | 'error',
  message: string,
  createdObjects: Array<gdObject>,
|};

export type AssetSearchAndInstallOptions = {|
  scene: gdLayout,
  objectName: string,
  objectType: string,
  searchTerms: string,
  description: string,
  twoDimensionalViewKind: string,
|};

export type EditorCallbacks = {|
  onOpenLayout: (
    sceneName: string,
    options: {|
      openEventsEditor: boolean,
      openSceneEditor: boolean,
      focusWhenOpened:
        | 'scene-or-events-otherwise'
        | 'scene'
        | 'events'
        | 'none',
    |}
  ) => void,
|};

export type SceneEventsOutsideEditorChanges = {|
  scene: gdLayout,
  newOrChangedAiGeneratedEventIds: Set<string>,
|};

/**
 * A function that does something in the editor on the given project.
 */
export type EditorFunction = {|
  renderForEditor: (options: {|
    project: gdProject | null,
    args: any,
    editorCallbacks: EditorCallbacks,
    shouldShowDetails: boolean,
  |}) => {|
    text: React.Node,
    details?: ?React.Node,
    hasDetailsToShow?: boolean,
  |},
  launchFunction: (options: {|
    project: gdProject,
    args: any,
    generateEvents: (
      options: EventsGenerationOptions
    ) => Promise<EventsGenerationResult>,
    onSceneEventsModifiedOutsideEditor: (
      changes: SceneEventsOutsideEditorChanges
    ) => void,
    ensureExtensionInstalled: (options: {|
      extensionName: string,
    |}) => Promise<void>,
    searchAndInstallAsset: (
      options: AssetSearchAndInstallOptions
    ) => Promise<AssetSearchAndInstallResult>,
  |}) => Promise<EditorFunctionGenericOutput>,
|};

/**
 * Helper function to safely extract required string arguments
 */
const extractRequiredString = (args: any, propertyName: string): string => {
  const value = SafeExtractor.extractStringProperty(args, propertyName);
  if (value === null) {
    throw new Error(
      `Missing or invalid required string argument: ${propertyName}`
    );
  }
  return value;
};

const makeGenericFailure = (message: string): EditorFunctionGenericOutput => ({
  success: false,
  message,
});

const makeGenericSuccess = (message: string): EditorFunctionGenericOutput => ({
  success: true,
  message,
});

const shouldHideProperty = (property: gdPropertyDescriptor): boolean => {
  return (
    property.isHidden() ||
    property.isDeprecated() ||
    property.getType() === 'Behavior' // No need to mess around with the "required behaviors", they are automatically filled.
  );
};

const serializeNamedProperty = (
  name: string,
  property: gdPropertyDescriptor
): null | {} => {
  return {
    name,
    ...serializeToJSObject(property),
    group: undefined,
    quickCustomizationVisibility: undefined,
    advanced: undefined,
  };
};

const findPropertyByName = ({
  properties,
  name,
}: {|
  properties: gdMapStringPropertyDescriptor | null,
  name: string,
|}): {|
  foundProperty: gdPropertyDescriptor | null,
  foundPropertyName: string | null,
|} => {
  if (!properties)
    return {
      foundProperty: null,
      foundPropertyName: null,
    };

  const propertyNames = properties.keys().toJSArray();
  const foundPropertyName =
    propertyNames.find(
      propertyName => propertyName.toLowerCase() === name.toLowerCase()
    ) || null;
  const foundProperty = foundPropertyName
    ? properties.get(foundPropertyName)
    : null;
  return {
    foundProperty,
    foundPropertyName,
  };
};

const sanitizePropertyNewValue = (
  property: gdPropertyDescriptor | null,
  newValue: string
): string => {
  // Note: updateProperty expect the booleans in an usual "0" or "1" format.
  if (property && property.getType().toLowerCase() === 'boolean') {
    const lowerCaseNewValue = newValue.toLowerCase();
    return lowerCaseNewValue === 'true' ||
      lowerCaseNewValue === 'yes' ||
      lowerCaseNewValue === '1'
      ? '1'
      : '0';
  }
  return newValue;
};

const makeShortTextForNamedProperty = (
  name: string,
  property: gdPropertyDescriptor
): string => {
  const type = property.getType();
  const measurementUnit = property.getMeasurementUnit();
  const measurementUnitText = measurementUnit.isUndefined()
    ? null
    : measurementUnit.getName();
  const value = property.getValue();

  if (type.toLowerCase() === 'number') {
    return `${name}: ${value} ${
      measurementUnitText ? `(${measurementUnitText})` : ''
    }`;
  }

  const choices =
    type.toLowerCase() === 'choice'
      ? [
          ...mapVector(property.getChoices(), choice => choice.getValue()),
          ...property.getExtraInfo().toJSArray(),
        ]
      : null;
  const information = [
    type,
    choices
      ? `one of: [${choices.map(choice => `"${choice}"`).join(', ')}]`
      : null,
    measurementUnitText,
  ].filter(Boolean);

  return `${name}: ${value} (${information.join(', ')})`;
};

/**
 * Creates a new object in the specified scene
 */
const createObject: EditorFunction = {
  renderForEditor: ({ args, editorCallbacks }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');

    return {
      text: (
        <Trans>
          Create object <b>{object_name}</b> in scene{' '}
          <Link
            href="#"
            onClick={() =>
              editorCallbacks.onOpenLayout(scene_name, {
                openEventsEditor: true,
                openSceneEditor: true,
                focusWhenOpened: 'scene',
              })
            }
          >
            {scene_name}
          </Link>
          .
        </Trans>
      ),
    };
  },
  launchFunction: async ({
    project,
    args,
    ensureExtensionInstalled,
    searchAndInstallAsset,
  }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_type = extractRequiredString(args, 'object_type');
    const object_name = extractRequiredString(args, 'object_name');
    const description = SafeExtractor.extractStringProperty(
      args,
      'description'
    );
    const search_terms = SafeExtractor.extractStringProperty(
      args,
      'search_terms'
    );
    const two_dimensional_view_kind = SafeExtractor.extractStringProperty(
      args,
      'two_dimensional_view_kind'
    );

    if (!project.hasLayoutNamed(scene_name)) {
      return makeGenericFailure(`Scene not found: "${scene_name}".`);
    }

    const layout = project.getLayout(scene_name);
    const objectsContainer = layout.getObjects();

    const getPropertiesText = (object: gdObject): string => {
      const objectConfiguration = object.getConfiguration();
      const properties = objectConfiguration.getProperties();
      const propertyShortTexts = properties
        .keys()
        .toJSArray()
        .map(
          (name: string): string | null => {
            const propertyDescriptor = properties.get(name);
            if (shouldHideProperty(propertyDescriptor)) return null;

            return makeShortTextForNamedProperty(name, propertyDescriptor);
          }
        )
        .filter(Boolean);

      const propertiesText = `It has the following properties: ${propertyShortTexts.join(
        ', '
      )}.`;
      return propertiesText;
    };

    // Check if object with this name already exists
    if (objectsContainer.hasObjectNamed(object_name)) {
      if (objectsContainer.getObject(object_name).getType() !== object_type) {
        return makeGenericFailure(
          `Object with name "${object_name}" already exists in scene "${scene_name}" but with a different type ("${object_type}").`
        );
      }

      return makeGenericSuccess(
        `Object with name "${object_name}" already exists, no need to re-create it.`
      );
    }

    // First try to search and install an object from the asset store.
    try {
      const { status, message, createdObjects } = await searchAndInstallAsset({
        scene: layout,
        objectName: object_name,
        objectType: object_type,
        searchTerms: search_terms || '',
        description: description || '',
        twoDimensionalViewKind: two_dimensional_view_kind || '',
      });

      if (status === 'error') {
        return makeGenericFailure(
          `Unable to search and install object (${message}).`
        );
      } else if (status === 'asset-installed') {
        if (createdObjects.length === 1) {
          const object = createdObjects[0];
          return makeGenericSuccess(
            [
              `Created (from the asset store) object "${object.getName()}" of type "${object.getType()}" in scene "${scene_name}".`,
              getPropertiesText(object),
            ].join(' ')
          );
        }

        return makeGenericSuccess(
          `Created (from the asset store) ${createdObjects
            .map(
              object =>
                `object "${object.getName()}" of type "${object.getType()}"`
            )
            .join(', ')} in scene "${scene_name}".`
        );
      } else {
        // No asset found - we'll create an object from scratch.
      }
    } catch (error) {
      return makeGenericFailure(
        `An unexpected error happened while search and installing objects (${
          error.message
        }).`
      );
    }

    // Create an object from scratch:
    // Ensure the extension for this object type is installed.
    if (object_type.includes('::')) {
      const extensionName = object_type.split('::')[0];
      try {
        await ensureExtensionInstalled({ extensionName });
      } catch (error) {
        console.error(
          `Could not get extension "${extensionName}" installed:`,
          error
        );
        return makeGenericFailure(
          `Could not install extension "${extensionName}" - should you consider trying with another object type?`
        );
      }
    }

    // Ensure the object type is valid.
    const objectMetadata = gd.MetadataProvider.getObjectMetadata(
      project.getCurrentPlatform(),
      object_type
    );
    if (gd.MetadataProvider.isBadObjectMetadata(objectMetadata)) {
      return makeGenericFailure(
        `Type "${object_type}" does not exist for objects.`
      );
    }

    const object = objectsContainer.insertNewObject(
      project,
      object_type,
      object_name,
      objectsContainer.getObjectsCount()
    );
    return makeGenericSuccess(
      [
        `Created a new object (from scratch) called "${object_name}" of type "${object_type}" in scene "${scene_name}".`,
        getPropertiesText(object),
      ].join(' ')
    );
  },
};

/**
 * Retrieves the properties of a specific object in a scene
 */
const inspectObjectProperties: EditorFunction = {
  renderForEditor: ({ args, editorCallbacks }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');

    return {
      text: (
        <Trans>
          Inspecting properties of object <b>{object_name}</b> in scene{' '}
          <Link
            href="#"
            onClick={() =>
              editorCallbacks.onOpenLayout(scene_name, {
                openEventsEditor: true,
                openSceneEditor: true,
                focusWhenOpened: 'scene',
              })
            }
          >
            {scene_name}
          </Link>
          .
        </Trans>
      ),
    };
  },
  launchFunction: async ({ project, args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');

    if (!project.hasLayoutNamed(scene_name)) {
      return makeGenericFailure(`Scene not found: "${scene_name}".`);
    }

    const layout = project.getLayout(scene_name);
    const objectsContainer = layout.getObjects();

    if (!objectsContainer.hasObjectNamed(object_name)) {
      return makeGenericFailure(
        `Object not found: "${object_name}" in scene "${scene_name}".`
      );
    }

    const object = objectsContainer.getObject(object_name);
    const objectConfiguration = object.getConfiguration();
    const objectProperties = objectConfiguration.getProperties();

    const propertyNames = objectProperties.keys().toJSArray();
    const properties = propertyNames
      .map(name => {
        const propertyDescriptor = objectProperties.get(name);
        if (shouldHideProperty(propertyDescriptor)) return null;

        return serializeNamedProperty(name, propertyDescriptor);
      })
      .filter(Boolean);

    // Also include information about behaviors:
    const behaviors = object
      .getAllBehaviorNames()
      .toJSArray()
      .map(behaviorName => {
        const behavior = object.getBehavior(behaviorName);
        return {
          behaviorName: behaviorName,
          behaviorType: behavior.getTypeName(),
        };
      });

    // Also include information about animations:
    const animationNames = mapFor(
      0,
      objectConfiguration.getAnimationsCount(),
      i => {
        return (
          objectConfiguration.getAnimationName(i) ||
          `(animation without name, animation index is: ${i})`
        );
      }
    );

    const output: EditorFunctionGenericOutput = {
      success: true,
      objectName: object_name,
      properties,
      behaviors,
    };
    if (animationNames.length > 0) {
      output.animationNames = animationNames.join(', ');
    }

    return output;
  },
};

/**
 * Changes a property of a specific object in a scene
 */
const changeObjectProperty: EditorFunction = {
  renderForEditor: ({ project, args, editorCallbacks }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');
    const property_name = extractRequiredString(args, 'property_name');
    const new_value = extractRequiredString(args, 'new_value');

    const makeText = (propertyLabel: string) => {
      return {
        text: (
          <Trans>
            Change property "<b>{propertyLabel}</b>" of object{' '}
            <b>{object_name}</b> (in scene{' '}
            <Link
              href="#"
              onClick={() =>
                editorCallbacks.onOpenLayout(scene_name, {
                  openEventsEditor: true,
                  openSceneEditor: true,
                  focusWhenOpened: 'scene',
                })
              }
            >
              {scene_name}
            </Link>
            ) to <b>{new_value}</b>.
          </Trans>
        ),
      };
    };

    if (!project || !project.hasLayoutNamed(scene_name)) {
      return makeText(property_name);
    }

    const layout = project.getLayout(scene_name);
    const objectsContainer = layout.getObjects();

    if (!objectsContainer.hasObjectNamed(object_name)) {
      return makeText(property_name);
    }

    const object = objectsContainer.getObject(object_name);
    const objectConfiguration = object.getConfiguration();
    const objectProperties = objectConfiguration.getProperties();

    const { foundProperty } = findPropertyByName({
      properties: objectProperties,
      name: property_name,
    });

    return makeText(foundProperty ? foundProperty.getLabel() : property_name);
  },
  launchFunction: async ({ project, args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');
    const property_name = extractRequiredString(args, 'property_name');
    const new_value = extractRequiredString(args, 'new_value');

    if (!project.hasLayoutNamed(scene_name)) {
      return makeGenericFailure(`Scene not found: "${scene_name}".`);
    }

    const layout = project.getLayout(scene_name);
    const objectsContainer = layout.getObjects();

    if (!objectsContainer.hasObjectNamed(object_name)) {
      return makeGenericFailure(
        `Object not found: "${object_name}" in scene "${scene_name}".`
      );
    }

    const object = objectsContainer.getObject(object_name);
    const objectConfiguration = object.getConfiguration();
    const objectProperties = objectConfiguration.getProperties();

    const { foundPropertyName, foundProperty } = findPropertyByName({
      properties: objectProperties,
      name: property_name,
    });

    if (!foundPropertyName) {
      return makeGenericFailure(
        `Property not found: ${property_name} on object ${object_name}.`
      );
    }

    if (
      !objectConfiguration.updateProperty(
        foundPropertyName,
        sanitizePropertyNewValue(foundProperty, new_value)
      )
    ) {
      return makeGenericFailure(
        `Could not change property "${foundPropertyName}" of object "${object_name}". The value might be invalid, of the wrong type or not allowed.`
      );
    }

    return makeGenericSuccess(
      `Changed property "${foundPropertyName}" of object "${object_name}" to "${new_value}".`
    );
  },
};

/**
 * Adds a behavior to an object in a scene
 */
const addBehavior: EditorFunction = {
  renderForEditor: ({ project, args, editorCallbacks }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');
    const behavior_type = extractRequiredString(args, 'behavior_type');
    const optionalBehaviorName = SafeExtractor.extractStringProperty(
      args,
      'behavior_name'
    );

    const makeText = (behaviorTypeLabel: string) => {
      return {
        text: (
          <Trans>
            Add behavior {behaviorName} (<b>{behaviorTypeLabel}</b>) on object{' '}
            <b>{object_name}</b> in scene{' '}
            <Link
              href="#"
              onClick={() =>
                editorCallbacks.onOpenLayout(scene_name, {
                  openEventsEditor: true,
                  openSceneEditor: true,
                  focusWhenOpened: 'scene',
                })
              }
            >
              {scene_name}
            </Link>
            .
          </Trans>
        ),
      };
    };

    if (!project) {
      return makeText(behavior_type);
    }

    const behaviorMetadata = gd.MetadataProvider.getBehaviorMetadata(
      project.getCurrentPlatform(),
      behavior_type
    );
    if (gd.MetadataProvider.isBadBehaviorMetadata(behaviorMetadata)) {
      return makeText(behavior_type);
    }

    // In almost all cases, we should use the behavior default name (especially because it
    // allows to share the same behavior shared data between objects).
    const behaviorName =
      optionalBehaviorName || behaviorMetadata.getDefaultName();

    return makeText(behaviorMetadata.getFullName());
  },
  launchFunction: async ({ project, args, ensureExtensionInstalled }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');
    const behavior_type = extractRequiredString(args, 'behavior_type');
    const optionalBehaviorName = SafeExtractor.extractStringProperty(
      args,
      'behavior_name'
    );

    if (!project.hasLayoutNamed(scene_name)) {
      return makeGenericFailure(`Scene not found: "${scene_name}".`);
    }

    const layout = project.getLayout(scene_name);
    const objectsContainer = layout.getObjects();

    if (!objectsContainer.hasObjectNamed(object_name)) {
      return makeGenericFailure(
        `Object not found: "${object_name}" in scene "${scene_name}".`
      );
    }

    const object = objectsContainer.getObject(object_name);

    // Ensure the extension for this behavior is installed.
    if (behavior_type.includes('::')) {
      const extensionName = behavior_type.split('::')[0];
      try {
        await ensureExtensionInstalled({ extensionName });
      } catch (error) {
        console.error(
          `Could not get extension "${extensionName}" installed:`,
          error
        );
        return makeGenericFailure(
          `Could not install extension "${extensionName}" - should you consider trying with another behavior type?`
        );
      }
    }

    const behaviorMetadata = gd.MetadataProvider.getBehaviorMetadata(
      project.getCurrentPlatform(),
      behavior_type
    );
    if (gd.MetadataProvider.isBadBehaviorMetadata(behaviorMetadata)) {
      return makeGenericFailure(
        `Type "${behavior_type}" does not exist for behaviors.`
      );
    }

    // In almost all cases, we should use the behavior default name (especially because it
    // allows to share the same behavior shared data between objects).
    const behaviorName =
      optionalBehaviorName || behaviorMetadata.getDefaultName();

    // Check if behavior with this name already exists
    if (object.hasBehaviorNamed(behaviorName)) {
      const behavior = object.getBehavior(behaviorName);
      if (behavior.getTypeName() !== behavior_type) {
        return makeGenericFailure(
          `Behavior with name "${behaviorName}" already exists on object "${object_name}" but with a different type ("${behavior_type}").`
        );
      }

      return makeGenericSuccess(
        `Behavior with name "${behaviorName}" already exists on object "${object_name}", no need to re-create it.`
      );
    }

    if (isBehaviorDefaultCapability(behaviorMetadata)) {
      const alreadyHasDefaultCapability = object
        .getAllBehaviorNames()
        .toJSArray()
        .some(behaviorName => {
          const behavior = object.getBehavior(behaviorName);
          return behavior.getTypeName() === behavior_type;
        });
      if (alreadyHasDefaultCapability) {
        return makeGenericSuccess(
          `Behavior "${behaviorName}" of type "${behavior_type}" is a default capability and is already available on object "${object_name}". There is no need to add it (and it can't be removed).`
        );
      }

      return makeGenericFailure(
        `Behavior "${behaviorName}" of type "${behavior_type}" is a default capability and cannot be added to object "${object_name}".`
      );
    }

    // Add the behavior
    gd.WholeProjectRefactorer.addBehaviorAndRequiredBehaviors(
      project,
      object,
      behavior_type,
      behaviorName
    );
    if (!object.hasBehaviorNamed(behaviorName)) {
      return makeGenericFailure(
        `Unexpected error: behavior "${behaviorName}" was not added to object "${object_name}" despite a valid type and name.`
      );
    }
    layout.updateBehaviorsSharedData(project);

    const behavior = object.getBehavior(behaviorName);

    const behaviorProperties = behavior.getProperties();
    const propertyShortTexts = behaviorProperties
      .keys()
      .toJSArray()
      .map(
        (name: string): string | null => {
          const propertyDescriptor = behaviorProperties.get(name);
          if (shouldHideProperty(propertyDescriptor)) return null;

          return makeShortTextForNamedProperty(name, propertyDescriptor);
        }
      )
      .filter(Boolean);

    const propertiesText = `It has the following properties: ${propertyShortTexts.join(
      ', '
    )}.`;

    return makeGenericSuccess(
      [
        `Added behavior called "${behaviorName}" with type "${behavior_type}" to object "${object_name}".`,
        propertiesText,
      ].join(' ')
    );
  },
};

/**
 * Removes a behavior from an object in a scene
 */
const removeBehavior: EditorFunction = {
  renderForEditor: ({ args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');
    const behavior_name = extractRequiredString(args, 'behavior_name');

    return {
      text: (
        <Trans>
          Remove behavior {behavior_name} from object {object_name} in scene{' '}
          {scene_name}.
        </Trans>
      ),
    };
  },
  launchFunction: async ({ project, args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');
    const behavior_name = extractRequiredString(args, 'behavior_name');

    if (!project.hasLayoutNamed(scene_name)) {
      return makeGenericFailure(`Scene not found: "${scene_name}".`);
    }

    const layout = project.getLayout(scene_name);
    const objectsContainer = layout.getObjects();

    if (!objectsContainer.hasObjectNamed(object_name)) {
      return makeGenericFailure(
        `Object not found: "${object_name}" in scene "${scene_name}".`
      );
    }

    const object = objectsContainer.getObject(object_name);

    if (!object.hasBehaviorNamed(behavior_name)) {
      return makeGenericFailure(
        `Behavior not found: "${behavior_name}" on object "${object_name}".`
      );
    }

    // Remove the behavior
    object.removeBehavior(behavior_name);

    return makeGenericSuccess(
      `Removed behavior "${behavior_name}" from object "${object_name}".`
    );
  },
};

/**
 * Retrieves the properties of a specific behavior attached to an object
 */
const inspectBehaviorProperties: EditorFunction = {
  renderForEditor: ({ args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');
    const behavior_name = extractRequiredString(args, 'behavior_name');

    return {
      text: (
        <Trans>
          Inspecting properties of behavior {behavior_name} on object{' '}
          {object_name} in scene {scene_name}.
        </Trans>
      ),
    };
  },
  launchFunction: async ({ project, args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');
    const behavior_name = extractRequiredString(args, 'behavior_name');

    if (!project.hasLayoutNamed(scene_name)) {
      return makeGenericFailure(`Scene not found: "${scene_name}".`);
    }

    const layout = project.getLayout(scene_name);
    const objectsContainer = layout.getObjects();

    if (!objectsContainer.hasObjectNamed(object_name)) {
      return makeGenericFailure(
        `Object not found: "${object_name}" in scene "${scene_name}".`
      );
    }

    const object = objectsContainer.getObject(object_name);

    if (!object.hasBehaviorNamed(behavior_name)) {
      return makeGenericFailure(
        `Behavior not found: "${behavior_name}" on object "${object_name}".`
      );
    }

    const behavior = object.getBehavior(behavior_name);
    const behaviorProperties = behavior.getProperties();
    const propertyNames = behaviorProperties.keys().toJSArray();
    const properties = propertyNames
      .map(name => {
        const propertyDescriptor = behaviorProperties.get(name);
        if (shouldHideProperty(propertyDescriptor)) return null;

        return serializeNamedProperty(name, propertyDescriptor);
      })
      .filter(Boolean);

    const allBehaviorSharedDataNames = layout
      .getAllBehaviorSharedDataNames()
      .toJSArray();

    let sharedProperties = undefined;
    if (allBehaviorSharedDataNames.includes(behavior_name)) {
      const behaviorSharedData = layout.getBehaviorSharedData(behavior_name);
      const behaviorSharedDataProperties = behaviorSharedData.getProperties();
      const behaviorSharedDataPropertyNames = behaviorSharedDataProperties
        .keys()
        .toJSArray();
      sharedProperties = behaviorSharedDataPropertyNames
        .map(name => {
          const propertyDescriptor = behaviorSharedDataProperties.get(name);
          if (shouldHideProperty(propertyDescriptor)) return null;

          return serializeNamedProperty(name, propertyDescriptor);
        })
        .filter(Boolean);
    }

    return {
      success: true,
      behaviorName: behavior_name,
      properties: properties,
      sharedProperties,
    };
  },
};

/**
 * Changes a property of a specific behavior attached to an object
 */
const changeBehaviorProperty: EditorFunction = {
  renderForEditor: ({ project, args, editorCallbacks }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');
    const behavior_name = extractRequiredString(args, 'behavior_name');
    const property_name = extractRequiredString(args, 'property_name');
    const new_value = extractRequiredString(args, 'new_value');

    const makeText = (propertyLabel: string) => {
      return {
        text: (
          <Trans>
            Change property "<b>{propertyLabel}</b>" of behavior {behavior_name}{' '}
            on object <b>{object_name}</b> (in scene{' '}
            <Link
              href="#"
              onClick={() =>
                editorCallbacks.onOpenLayout(scene_name, {
                  openEventsEditor: true,
                  openSceneEditor: true,
                  focusWhenOpened: 'scene',
                })
              }
            >
              {scene_name}
            </Link>
            ) to <b>{new_value}</b>.
          </Trans>
        ),
      };
    };

    if (!project || !project.hasLayoutNamed(scene_name)) {
      return makeText(property_name);
    }

    const layout = project.getLayout(scene_name);
    const objectsContainer = layout.getObjects();

    if (!objectsContainer.hasObjectNamed(object_name)) {
      return makeText(property_name);
    }

    const object = objectsContainer.getObject(object_name);

    if (!object.hasBehaviorNamed(behavior_name)) {
      return makeText(property_name);
    }

    const behavior = object.getBehavior(behavior_name);
    const behaviorProperties = behavior.getProperties();

    const allBehaviorSharedDataNames = layout
      .getAllBehaviorSharedDataNames()
      .toJSArray();

    let behaviorSharedDataProperties = null;
    if (allBehaviorSharedDataNames.includes(behavior_name)) {
      const behaviorSharedData = layout.getBehaviorSharedData(behavior_name);
      behaviorSharedDataProperties = behaviorSharedData.getProperties();
    }

    const behaviorPropertySearch = findPropertyByName({
      properties: behaviorProperties,
      name: property_name,
    });

    const behaviorSharedDataPropertySearch = findPropertyByName({
      properties: behaviorSharedDataProperties,
      name: property_name,
    });

    if (behaviorPropertySearch.foundProperty) {
      return makeText(behaviorPropertySearch.foundProperty.getLabel());
    } else if (behaviorSharedDataPropertySearch.foundProperty) {
      return makeText(
        behaviorSharedDataPropertySearch.foundProperty.getLabel()
      );
    } else {
      return makeText(property_name);
    }
  },
  launchFunction: async ({ project, args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');
    const behavior_name = extractRequiredString(args, 'behavior_name');
    const property_name = extractRequiredString(args, 'property_name');
    const new_value = extractRequiredString(args, 'new_value');

    if (!project.hasLayoutNamed(scene_name)) {
      return makeGenericFailure(`Scene not found: "${scene_name}".`);
    }

    const layout = project.getLayout(scene_name);
    const objectsContainer = layout.getObjects();

    if (!objectsContainer.hasObjectNamed(object_name)) {
      return makeGenericFailure(
        `Object not found: "${object_name}" in scene "${scene_name}".`
      );
    }

    const object = objectsContainer.getObject(object_name);

    if (!object.hasBehaviorNamed(behavior_name)) {
      return makeGenericFailure(
        `Behavior not found: "${behavior_name}" on object "${object_name}".`
      );
    }

    const behavior = object.getBehavior(behavior_name);
    const behaviorProperties = behavior.getProperties();

    const allBehaviorSharedDataNames = layout
      .getAllBehaviorSharedDataNames()
      .toJSArray();

    let behaviorSharedData = null;
    let behaviorSharedDataProperties = null;
    if (allBehaviorSharedDataNames.includes(behavior_name)) {
      behaviorSharedData = layout.getBehaviorSharedData(behavior_name);
      behaviorSharedDataProperties = behaviorSharedData.getProperties();
    }

    const behaviorPropertySearch = findPropertyByName({
      properties: behaviorProperties,
      name: property_name,
    });

    const behaviorSharedDataPropertySearch = findPropertyByName({
      properties: behaviorSharedDataProperties,
      name: property_name,
    });

    if (behaviorPropertySearch.foundPropertyName) {
      const { foundPropertyName, foundProperty } = behaviorPropertySearch;
      if (
        !behavior.updateProperty(
          foundPropertyName,
          sanitizePropertyNewValue(foundProperty, new_value)
        )
      ) {
        return makeGenericFailure(
          `Could not change property "${foundPropertyName}" of behavior "${behavior_name}". The value might be invalid, of the wrong type or not allowed.`
        );
      }

      return makeGenericSuccess(
        `Changed property "${foundPropertyName}" of behavior "${behavior_name}" to "${new_value}".`
      );
    } else if (
      behaviorSharedData &&
      behaviorSharedDataPropertySearch.foundPropertyName
    ) {
      const {
        foundPropertyName,
        foundProperty,
      } = behaviorSharedDataPropertySearch;
      if (
        !behaviorSharedData.updateProperty(
          foundPropertyName,
          sanitizePropertyNewValue(foundProperty, new_value)
        )
      ) {
        return makeGenericFailure(
          `Could not change shared property "${foundPropertyName}" of behavior "${behavior_name}". The value might be invalid, of the wrong type or not allowed.`
        );
      }

      return makeGenericSuccess(
        `Changed property "${foundPropertyName}" of behavior "${behavior_name}" (shared between all objects having this behavior) to "${new_value}".`
      );
    } else {
      return makeGenericFailure(
        `Property "${property_name}" not found on behavior "${behavior_name}" of object "${object_name}".`
      );
    }
  },
};

/**
 * Lists all object instances in a scene
 */
const describeInstances: EditorFunction = {
  renderForEditor: ({ args, editorCallbacks }) => {
    const scene_name = extractRequiredString(args, 'scene_name');

    return {
      text: (
        <Trans>
          Inspecting instances of scene{' '}
          <Link
            href="#"
            onClick={() =>
              editorCallbacks.onOpenLayout(scene_name, {
                openEventsEditor: true,
                openSceneEditor: true,
                focusWhenOpened: 'scene',
              })
            }
          >
            {scene_name}.
          </Link>
        </Trans>
      ),
    };
  },
  launchFunction: async ({ project, args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');

    if (!project.hasLayoutNamed(scene_name)) {
      return makeGenericFailure(`Scene not found: "${scene_name}".`);
    }

    const layout = project.getLayout(scene_name);
    const initialInstances = layout.getInitialInstances();

    const instances = [];

    // For each layer
    mapFor(0, layout.getLayersCount(), i => {
      const layer = layout.getLayerAt(i);
      const layerName = layer.getName();

      getInstancesInLayoutForLayer(initialInstances, layerName).forEach(
        instance => {
          const serializedInstance = serializeToJSObject(instance);
          instances.push({
            ...serializedInstance,
            // Replace persistentUuid by id:
            persistentUuid: instance.getPersistentUuid(),
            id: instance.getPersistentUuid().slice(0, 10),
            // For now, don't expose these:
            initialVariables: undefined,
            numberProperties: undefined,
            stringProperties: undefined,
          });
        }
      );
    });

    return {
      success: true,
      instances: instances,
      instancesForSceneNamed: scene_name,
    };
  },
};

const iterateOnInstances = (initialInstances, callback) => {
  const instanceGetter = new gd.InitialInstanceJSFunctor();
  // $FlowFixMe - invoke is not writable
  instanceGetter.invoke = instancePtr => {
    // $FlowFixMe - wrapPointer is not exposed
    const instance: gdInitialInstance = gd.wrapPointer(
      instancePtr,
      gd.InitialInstance
    );
    callback(instance);
  };
  // $FlowFixMe - JSFunctor is incompatible with Functor
  initialInstances.iterateOverInstances(instanceGetter);
  instanceGetter.delete();
};

/**
 * Places new instance(s), or move/erase existing instances, of an existing object onto a specified 2D layer
 * within a scene using a virtual brush at given X, Y coordinates.
 * Can also be used to resize, rotate, change opacity or Z order of existing 2D instance(s).
 * Existing instances identifiers can be found by calling `describe_instances` (`id` field for each instance).
 */
const put2dInstances: EditorFunction = {
  renderForEditor: ({ args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');
    const layer_name = extractRequiredString(args, 'layer_name');
    const brush_kind = extractRequiredString(args, 'brush_kind');
    const brush_position = SafeExtractor.extractStringProperty(
      args,
      'brush_position'
    );
    const existing_instance_ids = SafeExtractor.extractStringProperty(
      args,
      'existing_instance_ids'
    );
    const existingInstanceIds = existing_instance_ids
      ? existing_instance_ids.split(',')
      : [];
    const new_instances_count = SafeExtractor.extractNumberProperty(
      args,
      'new_instances_count'
    );
    const newInstancesCount =
      !new_instances_count && existingInstanceIds.length === 0
        ? 1
        : new_instances_count;

    const existingInstanceCount = existing_instance_ids
      ? existing_instance_ids.split(',').length
      : 0;
    const brushPosition = brush_position
      ? brush_position.split(',').map(Number)
      : null;

    if (brush_kind === 'erase') {
      return {
        text: (
          <Trans>
            Erase {existingInstanceCount} instance(s) of object {object_name}{' '}
            (layer: {layer_name || 'base'}) in scene {scene_name}.
          </Trans>
        ),
      };
    }

    if (existingInstanceIds.length === 0) {
      return {
        text: (
          <Trans>
            Add {newInstancesCount} instance(s) of object {object_name} at{' '}
            {brushPosition ? (
              brushPosition.join(', ')
            ) : (
              <Trans>scene center</Trans>
            )}{' '}
            (layer: {layer_name || 'base'}) in scene {scene_name}.
          </Trans>
        ),
      };
    } else if (newInstancesCount === 0) {
      return {
        text: (
          <Trans>
            Move {existingInstanceCount} instance(s) of object {object_name} to{' '}
            {brushPosition ? (
              brushPosition.join(', ')
            ) : (
              <Trans>scene center</Trans>
            )}{' '}
            (layer: {layer_name || 'base'}) in scene {scene_name}.
          </Trans>
        ),
      };
    } else {
      return {
        text: (
          <Trans>
            Add {newInstancesCount} instance(s) and move {existingInstanceCount}{' '}
            instance(s) of object {object_name} to{' '}
            {brushPosition ? (
              brushPosition.join(', ')
            ) : (
              <Trans>scene center</Trans>
            )}{' '}
            (layer: {layer_name || 'base'}) in scene {scene_name}.
          </Trans>
        ),
      };
    }
  },
  launchFunction: async ({ project, args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');
    const layer_name = extractRequiredString(args, 'layer_name');
    const brush_kind = extractRequiredString(args, 'brush_kind');
    const brush_position = SafeExtractor.extractStringProperty(
      args,
      'brush_position'
    );
    const brush_size = SafeExtractor.extractNumberProperty(args, 'brush_size');
    const brush_end_position = SafeExtractor.extractStringProperty(
      args,
      'brush_end_position'
    );
    const existing_instance_ids = SafeExtractor.extractStringProperty(
      args,
      'existing_instance_ids'
    );
    const new_instances_count = SafeExtractor.extractNumberProperty(
      args,
      'new_instances_count'
    );
    const instances_z_order = SafeExtractor.extractNumberProperty(
      args,
      'instances_z_order'
    );
    const instances_size = SafeExtractor.extractStringProperty(
      args,
      'instances_size'
    );

    if (!project.hasLayoutNamed(scene_name)) {
      return makeGenericFailure(`Scene not found: "${scene_name}".`);
    }

    const layout = project.getLayout(scene_name);
    const objectsContainer = layout.getObjects();

    if (!objectsContainer.hasObjectNamed(object_name)) {
      return makeGenericFailure(
        `Object not found: "${object_name}" in scene "${scene_name}".`
      );
    }

    // Check if layer exists (empty string is allowed for base layer)
    if (layer_name !== '' && !layout.hasLayerNamed(layer_name)) {
      return makeGenericFailure(
        `Layer not found: ${layer_name} in scene "${scene_name}".`
      );
    }

    const existingInstanceIds = existing_instance_ids
      ? existing_instance_ids.split(',')
      : [];

    const initialInstances = layout.getInitialInstances();

    if (brush_kind === 'erase') {
      const brushPosition: Array<number> | null = brush_position
        ? brush_position.split(',').map(Number)
        : null;
      const brushSize = brush_size || 0;

      // Iterate on existing instances and remove them, and/or those inside the brush radius.
      const instancesToDelete = new Set();

      iterateOnInstances(initialInstances, instance => {
        if (instance.getLayer() !== layer_name) return;
        if (instance.getObjectName() !== object_name) return;
        if (
          existingInstanceIds.some(id =>
            instance.getPersistentUuid().startsWith(id)
          )
        ) {
          instancesToDelete.add(instance);
          return;
        }

        if (!brushPosition) return;

        if (brushSize === 0) {
          if (
            instance.getX() === brushPosition[0] &&
            instance.getY() === brushPosition[1]
          ) {
            instancesToDelete.add(instance);
            return;
          }
        } else {
          const distance = Math.sqrt(
            Math.pow(instance.getX() - brushPosition[0], 2) +
              Math.pow(instance.getY() - brushPosition[1], 2)
          );
          if (distance <= brushSize) {
            instancesToDelete.add(instance);
            return;
          }
        }
      });

      instancesToDelete.forEach(instance => {
        initialInstances.removeInstance(instance);
      });

      return makeGenericSuccess(
        `Erased ${instancesToDelete.size} instance${
          instancesToDelete.size > 1 ? 's' : ''
        } of object "${object_name}" on layer "${layer_name || 'base'}"`
      );
    } else {
      const brushPosition: Array<number> = brush_position
        ? brush_position.split(',').map(Number)
        : [
            project.getGameResolutionWidth() / 2,
            project.getGameResolutionHeight() / 2,
          ];
      const brushSize = brush_size || 0;
      const brushEndPosition = brush_end_position
        ? brush_end_position.split(',').map(Number)
        : null;

      // Compute the number of instances to create.
      const rowCount = SafeExtractor.extractNumberProperty(args, 'row_count');
      const columnCount = SafeExtractor.extractNumberProperty(
        args,
        'column_count'
      );

      let newInstancesCount =
        new_instances_count !== null ? new_instances_count : 0;
      if (newInstancesCount === 0 && existingInstanceIds.length === 0) {
        newInstancesCount =
          rowCount && columnCount ? rowCount * columnCount : 1;
      }

      // Create the array of existing instances to move/modify, and new instances to create.
      const modifiedAndCreatedInstances: Array<gdInitialInstance> = [];
      iterateOnInstances(initialInstances, instance => {
        if (instance.getLayer() !== layer_name) return;
        if (instance.getObjectName() !== object_name) return;
        if (
          existingInstanceIds.some(id =>
            instance.getPersistentUuid().startsWith(id)
          )
        ) {
          modifiedAndCreatedInstances.push(instance);
        }
      });
      for (let i = 0; i < newInstancesCount; i++) {
        const instance = initialInstances.insertNewInitialInstance();
        instance.setObjectName(object_name);
        instance.setLayer(layer_name);
        modifiedAndCreatedInstances.push(instance);
      }

      // Paint the new/modified instances with the brush.
      if (brush_kind === 'line') {
        const instancesCount = modifiedAndCreatedInstances.length;

        if (brushPosition && brushEndPosition) {
          const deltaX =
            instancesCount > 1
              ? (brushEndPosition[0] - brushPosition[0]) / (instancesCount - 1)
              : 0;
          const deltaY =
            instancesCount > 1
              ? (brushEndPosition[1] - brushPosition[1]) / (instancesCount - 1)
              : 0;

          modifiedAndCreatedInstances.forEach((instance, i) => {
            instance.setX(brushPosition[0] + i * deltaX);
            instance.setY(brushPosition[1] + i * deltaY);
          });
        }
      } else if (brush_kind === 'grid') {
        const instancesCount = modifiedAndCreatedInstances.length;

        if (brushPosition && brushEndPosition) {
          // Naively auto-compute the grid column and row count if not specified.
          const gridRowCount =
            rowCount || Math.floor(Math.sqrt(instancesCount));
          const gridRowSize =
            (brushEndPosition[0] - brushPosition[0]) / gridRowCount;
          const gridColumnCount =
            columnCount || Math.ceil(instancesCount / gridRowCount);
          const gridColumnSize =
            (brushEndPosition[1] - brushPosition[1]) / gridColumnCount;

          modifiedAndCreatedInstances.forEach((instance, i) => {
            const row = Math.floor(i / gridColumnCount);
            const column = i % gridColumnCount;

            instance.setX(brushPosition[0] + column * gridColumnSize);
            instance.setY(brushPosition[1] + row * gridRowSize);
          });
        }
      } else if (brush_kind === 'random_in_circle') {
        modifiedAndCreatedInstances.forEach(instance => {
          const randomRadius = Math.random() * brushSize;
          const randomAngle = Math.random() * 2 * Math.PI;

          instance.setX(
            brushPosition[0] + randomRadius * Math.cos(randomAngle)
          );
          instance.setY(
            brushPosition[1] + randomRadius * Math.sin(randomAngle)
          );
        });
      } else {
        if (brush_kind !== 'point') {
          console.warn(
            'Unknown brush kind: ' +
              brush_kind +
              " - assuming it's point brush instead."
          );
        }

        modifiedAndCreatedInstances.forEach(instance => {
          instance.setX(brushPosition[0]);
          instance.setY(brushPosition[1]);
        });
      }

      const instancesSize = instances_size
        ? instances_size.split(',').map(Number)
        : null;
      const instancesRotation = SafeExtractor.extractNumberProperty(
        args,
        'instances_rotation'
      );
      const instancesOpacity = SafeExtractor.extractNumberProperty(
        args,
        'instances_opacity'
      );

      modifiedAndCreatedInstances.forEach(instance => {
        if (instancesSize) {
          instance.setHasCustomSize(true);
          instance.setCustomWidth(instancesSize[0]);
          instance.setCustomHeight(instancesSize[1]);
        }
        if (instances_z_order !== null) {
          instance.setZOrder(instances_z_order);
        }
        if (instancesRotation !== null) {
          instance.setAngle(instancesRotation);
        }
        if (instancesOpacity !== null) {
          instance.setOpacity(instancesOpacity);
        }
      });

      return makeGenericSuccess(
        `Added ${newInstancesCount} instance${
          newInstancesCount > 1 ? 's' : ''
        } of object "${object_name}" using ${brush_kind} brush at ${brushPosition.join(
          ', '
        )} on layer "${layer_name || 'base'}"`
      );
    }
  },
};

/**
 * Places new instance(s), or move/erase existing instances, of an existing object
 * onto a specified 3D layer within a scene using a virtual brush at given X, Y, Z coordinates.
 * Can also be used to resize, rotate existing 3D instance(s).
 * Existing instances identifiers can be found by calling `describe_instances` (`id` field for each instance).
 */
const put3dInstances: EditorFunction = {
  renderForEditor: ({ args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');
    const layer_name = extractRequiredString(args, 'layer_name');
    const brush_kind = extractRequiredString(args, 'brush_kind');
    const brush_position = SafeExtractor.extractStringProperty(
      args,
      'brush_position'
    );
    const existing_instance_ids = SafeExtractor.extractStringProperty(
      args,
      'existing_instance_ids'
    );
    const existingInstanceIds = existing_instance_ids
      ? existing_instance_ids.split(',')
      : [];
    const new_instances_count = SafeExtractor.extractNumberProperty(
      args,
      'new_instances_count'
    );
    const newInstancesCount =
      !new_instances_count && existingInstanceIds.length === 0
        ? 1
        : new_instances_count;

    const existingInstanceCount = existing_instance_ids
      ? existing_instance_ids.split(',').length
      : 0;
    const brushPosition = brush_position
      ? brush_position.split(',').map(Number)
      : null;

    if (brush_kind === 'erase') {
      return {
        text: (
          <Trans>
            Erase {existingInstanceCount} instance(s) of object {object_name}{' '}
            (layer: {layer_name || 'base'}) in scene {scene_name}.
          </Trans>
        ),
      };
    }

    if (existingInstanceIds.length === 0) {
      return {
        text: (
          <Trans>
            Add {newInstancesCount} instance(s) of object {object_name} at{' '}
            {brushPosition ? (
              brushPosition.join(', ')
            ) : (
              <Trans>scene center</Trans>
            )}{' '}
            (layer: {layer_name || 'base'}) in scene {scene_name}.
          </Trans>
        ),
      };
    } else if (newInstancesCount === 0) {
      return {
        text: (
          <Trans>
            Move {existingInstanceCount} instance(s) of object {object_name} to{' '}
            {brushPosition ? (
              brushPosition.join(', ')
            ) : (
              <Trans>scene center</Trans>
            )}{' '}
            (layer: {layer_name || 'base'}) in scene {scene_name}.
          </Trans>
        ),
      };
    } else {
      return {
        text: (
          <Trans>
            Add {newInstancesCount} instance(s) and move {existingInstanceCount}{' '}
            instance(s) of object {object_name} to{' '}
            {brushPosition ? (
              brushPosition.join(', ')
            ) : (
              <Trans>scene center</Trans>
            )}{' '}
            (layer: {layer_name || 'base'}) in scene {scene_name}.
          </Trans>
        ),
      };
    }
  },
  launchFunction: async ({ project, args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const object_name = extractRequiredString(args, 'object_name');
    const layer_name = extractRequiredString(args, 'layer_name');
    const brush_kind = extractRequiredString(args, 'brush_kind');
    const brush_position = SafeExtractor.extractStringProperty(
      args,
      'brush_position'
    );
    const brush_size = SafeExtractor.extractNumberProperty(args, 'brush_size');
    const brush_end_position = SafeExtractor.extractStringProperty(
      args,
      'brush_end_position'
    );
    const existing_instance_ids = SafeExtractor.extractStringProperty(
      args,
      'existing_instance_ids'
    );
    const new_instances_count = SafeExtractor.extractNumberProperty(
      args,
      'new_instances_count'
    );
    const instances_size = SafeExtractor.extractStringProperty(
      args,
      'instances_size'
    );
    const instances_rotation = SafeExtractor.extractStringProperty(
      args,
      'instances_rotation'
    );

    if (!project.hasLayoutNamed(scene_name)) {
      return makeGenericFailure(`Scene not found: "${scene_name}".`);
    }

    const layout = project.getLayout(scene_name);
    const objectsContainer = layout.getObjects();

    if (!objectsContainer.hasObjectNamed(object_name)) {
      return makeGenericFailure(
        `Object not found: "${object_name}" in scene "${scene_name}".`
      );
    }

    // Check if layer exists (empty string is allowed for base layer)
    if (layer_name !== '' && !layout.hasLayerNamed(layer_name)) {
      return makeGenericFailure(
        `Layer not found: ${layer_name} in scene "${scene_name}".`
      );
    }

    const existingInstanceIds = existing_instance_ids
      ? existing_instance_ids.split(',')
      : [];

    const initialInstances = layout.getInitialInstances();

    if (brush_kind === 'erase') {
      const brushPosition: Array<number> | null = brush_position
        ? brush_position.split(',').map(Number)
        : null;
      const brushSize = brush_size || 0;

      // Iterate on existing instances and remove them, and/or those inside the brush radius.
      const instancesToDelete = new Set();

      iterateOnInstances(initialInstances, instance => {
        if (instance.getLayer() !== layer_name) return;
        if (instance.getObjectName() !== object_name) return;
        if (
          existingInstanceIds.some(id =>
            instance.getPersistentUuid().startsWith(id)
          )
        ) {
          instancesToDelete.add(instance);
          return;
        }

        if (!brushPosition) return;

        if (brushSize <= 0) {
          if (
            instance.getX() === brushPosition[0] &&
            instance.getY() === brushPosition[1] &&
            instance.getZ() === brushPosition[2]
          ) {
            instancesToDelete.add(instance);
            return;
          }
        } else {
          const distance = Math.sqrt(
            Math.pow(instance.getX() - brushPosition[0], 2) +
              Math.pow(instance.getY() - brushPosition[1], 2) +
              Math.pow(instance.getZ() - brushPosition[2], 2)
          );
          if (distance <= brushSize) {
            instancesToDelete.add(instance);
            return;
          }
        }
      });

      instancesToDelete.forEach(instance => {
        initialInstances.removeInstance(instance);
      });

      return makeGenericSuccess(
        `Erased ${instancesToDelete.size} instance${
          instancesToDelete.size > 1 ? 's' : ''
        } of object "${object_name}" on layer "${layer_name || 'base'}"`
      );
    } else {
      const brushPosition: Array<number> = brush_position
        ? brush_position.split(',').map(Number)
        : [
            project.getGameResolutionWidth() / 2,
            project.getGameResolutionHeight() / 2,
            0,
          ];
      const brushSize = brush_size || 0;
      const brushEndPosition: Array<number> | null = brush_end_position
        ? brush_end_position.split(',').map(Number)
        : null;

      let newInstancesCount =
        new_instances_count !== null ? new_instances_count : 0;
      if (newInstancesCount === 0 && existingInstanceIds.length === 0) {
        newInstancesCount = 1;
      }

      // Create the array of existing instances to move/modify, and new instances to create.
      const modifiedAndCreatedInstances: Array<gdInitialInstance> = [];
      iterateOnInstances(initialInstances, instance => {
        if (instance.getLayer() !== layer_name) return;
        if (instance.getObjectName() !== object_name) return;
        if (
          existingInstanceIds.some(id =>
            instance.getPersistentUuid().startsWith(id)
          )
        ) {
          modifiedAndCreatedInstances.push(instance);
        }
      });
      for (let i = 0; i < newInstancesCount; i++) {
        const instance = initialInstances.insertNewInitialInstance();
        instance.setObjectName(object_name);
        instance.setLayer(layer_name);
        modifiedAndCreatedInstances.push(instance);
      }

      // Paint the new/modified instances with the brush.
      if (brush_kind === 'line') {
        const instancesCount = modifiedAndCreatedInstances.length;

        if (brushPosition && brushEndPosition) {
          const deltaX =
            instancesCount > 1
              ? (brushEndPosition[0] - brushPosition[0]) / (instancesCount - 1)
              : 0;
          const deltaY =
            instancesCount > 1
              ? (brushEndPosition[1] - brushPosition[1]) / (instancesCount - 1)
              : 0;
          const deltaZ =
            instancesCount > 1
              ? (brushEndPosition[2] - brushPosition[2]) / (instancesCount - 1)
              : 0;

          modifiedAndCreatedInstances.forEach((instance, i) => {
            instance.setX(brushPosition[0] + i * deltaX);
            instance.setY(brushPosition[1] + i * deltaY);
            instance.setZ(brushPosition[2] + i * deltaZ);
          });
        }
      } else if (brush_kind === 'random_in_sphere') {
        modifiedAndCreatedInstances.forEach(instance => {
          if (!brushPosition) return;

          const randomRadius = Math.random() * brushSize;
          const randomTheta = Math.random() * 2 * Math.PI; // Azimuthal angle
          const randomPhi = Math.acos(2 * Math.random() - 1); // Polar angle

          instance.setX(
            brushPosition[0] +
              randomRadius * Math.sin(randomPhi) * Math.cos(randomTheta)
          );
          instance.setY(
            brushPosition[1] +
              randomRadius * Math.sin(randomPhi) * Math.sin(randomTheta)
          );
          instance.setZ(brushPosition[2] + randomRadius * Math.cos(randomPhi));
        });
      } else {
        if (brush_kind !== 'point') {
          console.warn(
            'Unknown brush kind: ' +
              brush_kind +
              " - assuming it's point brush instead."
          );
        }

        modifiedAndCreatedInstances.forEach(instance => {
          if (!brushPosition) return;

          instance.setX(brushPosition[0]);
          instance.setY(brushPosition[1]);
          instance.setZ(brushPosition[2]);
        });
      }

      const instancesSizeArray = instances_size
        ? instances_size.split(',').map(Number)
        : null;
      const instancesRotationArray = instances_rotation
        ? instances_rotation.split(',').map(coord => parseFloat(coord) || 0)
        : null;

      modifiedAndCreatedInstances.forEach(instance => {
        if (instancesSizeArray && instancesSizeArray.length >= 3) {
          instance.setHasCustomSize(true);
          instance.setHasCustomDepth(true);
          instance.setCustomWidth(instancesSizeArray[0]);
          instance.setCustomHeight(instancesSizeArray[1]);
          instance.setCustomDepth(instancesSizeArray[2]);
        }
        if (instancesRotationArray && instancesRotationArray.length >= 3) {
          instance.setRotationX(instancesRotationArray[0]);
          instance.setRotationY(instancesRotationArray[1]);
          instance.setAngle(instancesRotationArray[2]);
        }
      });

      return makeGenericSuccess(
        `Added ${newInstancesCount} instance${
          newInstancesCount > 1 ? 's' : ''
        } of object "${object_name}" using ${brush_kind} brush at ${brushPosition.join(
          ', '
        )}) on layer "${layer_name || 'base'}"`
      );
    }
  },
};

/**
 * Retrieves the event sheet structure for a scene
 */
const readSceneEvents: EditorFunction = {
  renderForEditor: ({ args, editorCallbacks }) => {
    const scene_name = extractRequiredString(args, 'scene_name');

    return {
      text: (
        <Trans>
          Inspecting event sheet of scene{' '}
          <Link
            href="#"
            onClick={() =>
              editorCallbacks.onOpenLayout(scene_name, {
                openEventsEditor: true,
                openSceneEditor: true,
                focusWhenOpened: 'events',
              })
            }
          >
            {scene_name}
          </Link>
          .
        </Trans>
      ),
    };
  },
  launchFunction: async ({ project, args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');

    if (!project.hasLayoutNamed(scene_name)) {
      return makeGenericFailure(`Scene not found: "${scene_name}".`);
    }

    const scene = project.getLayout(scene_name);
    const events = scene.getEvents();

    const eventsAsText = renderNonTranslatedEventsAsText({
      eventsList: events,
    });

    return {
      success: true,
      eventsForSceneNamed: scene_name,
      eventsAsText,
    };
  },
};

/**
 * Adds a new event to a scene's event sheet
 */
const addSceneEvents: EditorFunction = {
  renderForEditor: ({ args, shouldShowDetails, editorCallbacks }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const eventsDescription = extractRequiredString(args, 'events_description');
    const objectsListArgument = SafeExtractor.extractStringProperty(
      args,
      'objects_list'
    );
    const objectsList = objectsListArgument === null ? '' : objectsListArgument;
    const placementHint =
      SafeExtractor.extractStringProperty(args, 'placement_hint') || '';

    const details = shouldShowDetails ? (
      <ColumnStackLayout noMargin>
        {eventsDescription && (
          <Text noMargin allowSelection color="secondary">
            <b>
              <Trans>Description</Trans>
            </b>
            : {eventsDescription}
          </Text>
        )}
        {placementHint && (
          <Text noMargin allowSelection color="secondary">
            <b>
              <Trans>Generation hint</Trans>
            </b>
            : {placementHint}
          </Text>
        )}
        {objectsList && (
          <Text noMargin allowSelection color="secondary">
            <b>
              <Trans>Related objects</Trans>
            </b>
            : {objectsList}
          </Text>
        )}
      </ColumnStackLayout>
    ) : null;

    if (eventsDescription) {
      return {
        text: (
          <Trans>
            Add or rework{' '}
            <Link
              href="#"
              onClick={() =>
                editorCallbacks.onOpenLayout(scene_name, {
                  openEventsEditor: true,
                  openSceneEditor: true,
                  focusWhenOpened: 'events',
                })
              }
            >
              events of scene {scene_name}
            </Link>
            .
          </Trans>
        ),
        details,
        hasDetailsToShow: true,
      };
    } else if (placementHint) {
      return {
        text: (
          <Trans>
            Adapt{' '}
            <Link
              href="#"
              onClick={() =>
                editorCallbacks.onOpenLayout(scene_name, {
                  openEventsEditor: true,
                  openSceneEditor: true,
                  focusWhenOpened: 'events',
                })
              }
            >
              events of scene {scene_name}
            </Link>{' '}
            ("{placementHint}").
          </Trans>
        ),
        details,
        hasDetailsToShow: true,
      };
    } else {
      return {
        text: (
          <Trans>
            Modify{' '}
            <Link
              href="#"
              onClick={() =>
                editorCallbacks.onOpenLayout(scene_name, {
                  openEventsEditor: true,
                  openSceneEditor: true,
                  focusWhenOpened: 'events',
                })
              }
            >
              events of scene {scene_name}
            </Link>
            .
          </Trans>
        ),
        details,
        hasDetailsToShow: true,
      };
    }
  },
  launchFunction: async ({
    project,
    args,
    generateEvents,
    onSceneEventsModifiedOutsideEditor,
    ensureExtensionInstalled,
  }) => {
    const sceneName = extractRequiredString(args, 'scene_name');
    const eventsDescription = extractRequiredString(args, 'events_description');
    const extensionNamesList = extractRequiredString(
      args,
      'extension_names_list'
    );
    const objectsListArgument = SafeExtractor.extractStringProperty(
      args,
      'objects_list'
    );
    const objectsList = objectsListArgument === null ? '' : objectsListArgument;
    const placementHint =
      SafeExtractor.extractStringProperty(args, 'placement_hint') || '';

    if (!project.hasLayoutNamed(sceneName)) {
      return makeGenericFailure(`Scene not found: "${sceneName}".`);
    }
    const scene = project.getLayout(sceneName);
    const currentSceneEvents = scene.getEvents();

    const existingEventsAsText = renderNonTranslatedEventsAsText({
      eventsList: currentSceneEvents,
    });

    try {
      const eventsGenerationResult: EventsGenerationResult = await generateEvents(
        {
          sceneName,
          eventsDescription,
          extensionNamesList,
          objectsList,
          existingEventsAsText,
          placementHint,
        }
      );

      if (!eventsGenerationResult.generationCompleted) {
        return makeGenericFailure(
          `Infrastructure error when launching or completing events generation (${
            eventsGenerationResult.errorMessage
          }). Consider trying again or a different approach.`
        );
      }

      const aiGeneratedEvent = eventsGenerationResult.aiGeneratedEvent;

      const makeAiGeneratedEventFailure = (
        message: string,
        details?: {|
          generatedEventsErrorDiagnostics: string,
        |}
      ) => {
        return {
          success: false,
          message,
          aiGeneratedEventId: aiGeneratedEvent.id,
          ...details,
        };
      };

      if (aiGeneratedEvent.error) {
        return makeAiGeneratedEventFailure(
          `Infrastructure error when generating events (${
            aiGeneratedEvent.error.message
          }). Consider trying again or a different approach.`
        );
      }

      const changes = aiGeneratedEvent.changes;
      if (!changes || changes.length === 0) {
        const resultMessage =
          aiGeneratedEvent.resultMessage ||
          'No generated events found and no other information was given.';
        return makeAiGeneratedEventFailure(
          `Error when generating events: ${resultMessage}\nConsider trying again or a different approach.`
        );
      }

      if (
        changes.some(change => change.isEventsJsonValid === false) ||
        changes.some(change => change.areEventsValid === false)
      ) {
        const resultMessage =
          aiGeneratedEvent.resultMessage ||
          'This probably means what you asked for is not possible or does not work like this.';
        return makeAiGeneratedEventFailure(
          `Generated events are not valid: ${resultMessage}\nRead also the attached diagnostics to try to understand what went wrong and either try again differently or consider a different approach.`,
          {
            generatedEventsErrorDiagnostics: changes
              .map(change => change.diagnosticLines.join('\n'))
              .join('\n\n'),
          }
        );
      }

      try {
        const extensionNames = new Set();
        for (const change of changes) {
          for (const extensionName of change.extensionNames || []) {
            extensionNames.add(extensionName);
          }
        }
        for (const extensionName of extensionNames) {
          await ensureExtensionInstalled({ extensionName });
        }
      } catch (e) {
        return makeAiGeneratedEventFailure(
          `Error when installing extensions: ${
            e.message
          }. Consider trying again or a different approach.`
        );
      }
      try {
        for (const change of changes) {
          addUndeclaredVariables({
            project,
            scene,
            undeclaredVariables: change.undeclaredVariables,
          });

          const objectNames = Object.keys(change.undeclaredObjectVariables);
          for (const objectName of objectNames) {
            const undeclaredVariables =
              change.undeclaredObjectVariables[objectName];
            addObjectUndeclaredVariables({
              project,
              scene,
              objectName,
              undeclaredVariables,
            });
          }
        }

        applyEventsChanges(
          project,
          currentSceneEvents,
          changes,
          aiGeneratedEvent.id
        );
        onSceneEventsModifiedOutsideEditor({
          scene,
          newOrChangedAiGeneratedEventIds: new Set([aiGeneratedEvent.id]),
        });

        const resultMessage =
          aiGeneratedEvent.resultMessage ||
          'Properly modified or added new event(s).';
        return {
          success: true,
          message: resultMessage,
          aiGeneratedEventId: aiGeneratedEvent.id,
        };
      } catch (error) {
        console.error(
          `Unexpected error when adding events from an AI Generated Event (id: ${
            aiGeneratedEvent.id
          }):`,
          error
        );
        return makeAiGeneratedEventFailure(
          `An unexpected error happened in the GDevelop editor while adding generated events: ${
            error.message
          }. Consider a different approach.`
        );
      }
    } catch (error) {
      console.error(
        'Unexpected error when creating AI Generated Event:',
        error
      );
      return makeGenericFailure(
        `An unexpected error happened in the GDevelop editor while creating generated events: ${
          error.message
        }. Consider a different approach.`
      );
    }
  },
};

/**
 * Creates a new, empty scene
 */
const createScene: EditorFunction = {
  renderForEditor: ({ args, editorCallbacks }) => {
    const scene_name = extractRequiredString(args, 'scene_name');

    return {
      text: (
        <Trans>
          Create a new scene called <b>{scene_name}</b>.{' '}
          <Link
            href="#"
            onClick={() =>
              editorCallbacks.onOpenLayout(scene_name, {
                openEventsEditor: true,
                openSceneEditor: true,
                focusWhenOpened: 'scene',
              })
            }
          >
            Click to open it
          </Link>
          .
        </Trans>
      ),
    };
  },
  launchFunction: async ({ project, args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');
    const include_ui_layer = SafeExtractor.extractBooleanProperty(
      args,
      'include_ui_layer'
    );
    const background_color = SafeExtractor.extractStringProperty(
      args,
      'background_color'
    );

    if (project.hasLayoutNamed(scene_name)) {
      const scene = project.getLayout(scene_name);
      if (include_ui_layer && !scene.hasLayerNamed('UI')) {
        scene.insertNewLayer('UI', 1);
        return makeGenericSuccess(
          `Scene with name "${scene_name}" already exists, no need to re-create it. A layer called "UI" was added to it.`
        );
      }

      return makeGenericSuccess(
        `Scene with name "${scene_name}" already exists, no need to re-create it.`
      );
    }

    const scenesCount = project.getLayoutsCount();
    const scene = project.insertNewLayout(scene_name, scenesCount);
    if (include_ui_layer) {
      scene.insertNewLayer('UI', 0);
    }
    if (background_color) {
      const colorAsRgb = hexNumberToRGBArray(
        rgbOrHexToHexNumber(background_color)
      );
      scene.setBackgroundColor(colorAsRgb[0], colorAsRgb[1], colorAsRgb[2]);
    }

    return makeGenericSuccess(
      include_ui_layer
        ? `Created new scene "${scene_name}" with the base layer and a layer called "UI".`
        : `Created new scene "${scene_name}".`
    );
  },
};

/**
 * Deletes an existing scene
 */
const deleteScene: EditorFunction = {
  renderForEditor: ({ args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');

    return {
      text: <Trans>Delete scene {scene_name}.</Trans>,
    };
  },
  launchFunction: async ({ project, args }) => {
    const scene_name = extractRequiredString(args, 'scene_name');

    if (!project.hasLayoutNamed(scene_name)) {
      return makeGenericSuccess(
        `Scene is already non existent or deleted: "${scene_name}". No need to delete it.`
      );
    }

    project.removeLayout(scene_name);

    return makeGenericSuccess(`Deleted scene "${scene_name}".`);
  },
};

const addOrEditVariable: EditorFunction = {
  renderForEditor: ({ args, shouldShowDetails }) => {
    const variable_name_or_path = extractRequiredString(
      args,
      'variable_name_or_path'
    );
    const variable_scope = extractRequiredString(args, 'variable_scope');
    const value = extractRequiredString(args, 'value');
    const object_name = SafeExtractor.extractStringProperty(
      args,
      'object_name'
    );
    const scene_name = SafeExtractor.extractStringProperty(args, 'scene_name');

    const details = shouldShowDetails ? (
      <ColumnStackLayout noMargin>
        <Text noMargin allowSelection color="secondary">
          <b>
            <Trans>Value</Trans>
          </b>
          : {value}
        </Text>
      </ColumnStackLayout>
    ) : null;

    if (variable_scope === 'scene') {
      return {
        text: (
          <Trans>
            Add or edit scene variable {variable_name_or_path} in scene{' '}
            {scene_name}.
          </Trans>
        ),
        details,
        hasDetailsToShow: true,
      };
    } else if (variable_scope === 'object') {
      return {
        text: (
          <Trans>
            Add or edit object variable {variable_name_or_path} for object{' '}
            {object_name}.
          </Trans>
        ),
        details,
        hasDetailsToShow: true,
      };
    } else if (variable_scope === 'global') {
      return {
        text: (
          <Trans>Add or edit global variable {variable_name_or_path}.</Trans>
        ),
        details,
        hasDetailsToShow: true,
      };
    }

    return {
      text: <Trans>Add or edit variable {variable_name_or_path}.</Trans>,
    };
  },
  launchFunction: async ({ project, args }) => {
    const variable_name_or_path = extractRequiredString(
      args,
      'variable_name_or_path'
    );
    const value = extractRequiredString(args, 'value');
    const variable_type = SafeExtractor.extractStringProperty(
      args,
      'variable_type'
    );
    const variable_scope = extractRequiredString(args, 'variable_scope');
    const object_name = SafeExtractor.extractStringProperty(
      args,
      'object_name'
    );
    const scene_name = SafeExtractor.extractStringProperty(args, 'scene_name');

    let variablesContainer;
    if (variable_scope === 'scene') {
      if (!scene_name) {
        return makeGenericFailure(
          `Missing "scene_name" argument, required to edit a scene variable.`
        );
      }
      if (!project.hasLayoutNamed(scene_name)) {
        return makeGenericFailure(`Scene not found: "${scene_name}".`);
      }
      variablesContainer = project.getLayout(scene_name).getVariables();
    } else if (variable_scope === 'object') {
      if (!object_name) {
        return makeGenericFailure(
          `Missing "object_name" argument, required to edit an object variable.`
        );
      }

      let objectsContainer;
      if (scene_name) {
        if (!project.hasLayoutNamed(scene_name)) {
          return makeGenericFailure(`Scene not found: "${scene_name}".`);
        }
        objectsContainer = project.getLayout(scene_name).getObjects();
        if (!objectsContainer.hasObjectNamed(object_name)) {
          return makeGenericFailure(
            `Object not found: "${object_name}" in scene "${scene_name}". Have you created it? For a global object, don't specify the scene name.`
          );
        }
      } else {
        objectsContainer = project.getObjects();
        if (!objectsContainer.hasObjectNamed(object_name)) {
          return makeGenericFailure(
            `Object not found: "${object_name}" in project. Have you created it or forgot to specify the scene name?`
          );
        }
      }

      variablesContainer = objectsContainer
        .getObject(object_name)
        .getVariables();
    } else if (variable_scope === 'global') {
      variablesContainer = project.getVariables();
    } else {
      return makeGenericFailure(
        `Invalid "variable_scope" argument: "${variable_scope}". Valid values are \`scene\`, \`object\` or \`global\`.`
      );
    }

    const { addedNewVariable, variableType } = applyVariableChange({
      variablePath: variable_name_or_path,
      forcedVariableType: variable_type,
      variablesContainer,
      value,
    });

    return makeGenericSuccess(
      addedNewVariable
        ? `Properly added variable "${variable_name_or_path}" of type "${variableType}".`
        : `Properly edited variable "${variable_name_or_path}".`
    );
  },
};

export const editorFunctions: { [string]: EditorFunction } = {
  create_object: createObject,
  inspect_object_properties: inspectObjectProperties,
  change_object_property: changeObjectProperty,
  add_behavior: addBehavior,
  remove_behavior: removeBehavior,
  inspect_behavior_properties: inspectBehaviorProperties,
  change_behavior_property: changeBehaviorProperty,
  describe_instances: describeInstances,
  put_2d_instances: put2dInstances,
  put_3d_instances: put3dInstances,
  read_scene_events: readSceneEvents,
  add_scene_events: addSceneEvents,
  create_scene: createScene,
  delete_scene: deleteScene,
  add_or_edit_variable: addOrEditVariable,
};
