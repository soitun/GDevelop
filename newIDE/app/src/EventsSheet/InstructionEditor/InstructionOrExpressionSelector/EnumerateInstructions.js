// @flow
import { type InstructionOrExpressionInformation } from './InstructionOrExpressionInformation.flow.js';
const gd = global.gd;

const GROUP_DELIMITER = '/';

const enumerateExtensionInstructions = (
  groupPrefix: string,
  extensionInstructions
): Array<InstructionOrExpressionInformation> => {
  //Get the map containing the metadata of the instructions provided by the extension...
  var instructionsTypes = extensionInstructions.keys();
  const allInstructions = [];

  //... and add each instruction
  for (let j = 0; j < instructionsTypes.size(); ++j) {
    const instrMetadata = extensionInstructions.get(instructionsTypes.get(j));
    if (instrMetadata.isHidden()) continue;

    const displayedName = instrMetadata.getFullName();
    const groupName = instrMetadata.getGroup();
    const iconFilename = instrMetadata.getIconFilename();
    const fullGroupName = groupPrefix + groupName;

    allInstructions.push({
      type: instructionsTypes.get(j),
      metadata: instrMetadata,
      iconFilename,
      displayedName,
      fullGroupName,
    });
  }

  return allInstructions;
};

export const enumerateInstructions = (
  isCondition: boolean
): Array<InstructionOrExpressionInformation> => {
  let allInstructions = [];

  const allExtensions = gd
    .asPlatform(gd.JsPlatform.get())
    .getAllPlatformExtensions();
  for (let i = 0; i < allExtensions.size(); ++i) {
    const extension = allExtensions.get(i);
    const allObjectsTypes = extension.getExtensionObjectsTypes();
    const allBehaviorsTypes = extension.getBehaviorsTypes();

    let prefix = '';
    if (allObjectsTypes.size() > 0 || allBehaviorsTypes.size() > 0) {
      prefix =
        extension.getName() === 'BuiltinObject'
          ? 'Common ' +
            (isCondition ? 'conditions' : 'actions') +
            ' for all objects'
          : extension.getFullName();
      prefix += GROUP_DELIMITER;
    }

    //Free instructions
    allInstructions = [
      ...allInstructions,
      ...enumerateExtensionInstructions(
        prefix,
        isCondition ? extension.getAllConditions() : extension.getAllActions()
      ),
    ];

    //Objects instructions:
    for (let j = 0; j < allObjectsTypes.size(); ++j) {
      allInstructions = [
        ...allInstructions,
        ...enumerateExtensionInstructions(
          prefix,
          isCondition
            ? extension.getAllConditionsForObject(allObjectsTypes.get(j))
            : extension.getAllActionsForObject(allObjectsTypes.get(j))
        ),
      ];
    }

    //Behaviors instructions:
    for (let j = 0; j < allBehaviorsTypes.size(); ++j) {
      allInstructions = [
        ...allInstructions,
        ...enumerateExtensionInstructions(
          prefix,
          isCondition
            ? extension.getAllConditionsForBehavior(allBehaviorsTypes.get(j))
            : extension.getAllActionsForBehavior(allBehaviorsTypes.get(j))
        ),
      ];
    }
  }

  return allInstructions;
};

/**
 * List all the instructions that can be used for the given object,
 * in the given context. This includes instructions for the behaviors
 * attached to the object.
 */
export const enumerateObjectInstructions = (
  isCondition: boolean,
  globalObjectsContainer: gdObjectsContainer,
  objectsContainer: gdObjectsContainer,
  objectName: string
): Array<InstructionOrExpressionInformation> => {
  let allInstructions = [];

  const objectType: string = gd.getTypeOfObject(
    globalObjectsContainer,
    objectsContainer,
    objectName,
    true
  );
  const objectBehaviorNames: Array<string> = gd
    .getBehaviorsOfObject(
      globalObjectsContainer,
      objectsContainer,
      objectName,
      true
    )
    .toJSArray();
  const objectBehaviorTypes = new Set(
    objectBehaviorNames.map(behaviorName =>
      gd.getTypeOfBehavior(
        globalObjectsContainer,
        objectsContainer,
        behaviorName
      )
    )
  );

  const allExtensions = gd
    .asPlatform(gd.JsPlatform.get())
    .getAllPlatformExtensions();
  for (let i = 0; i < allExtensions.size(); ++i) {
    const extension = allExtensions.get(i);
    const hasObjectType =
      extension
        .getExtensionObjectsTypes()
        .toJSArray()
        .indexOf(objectType) !== -1;
    const hasBaseObjectType =
      extension
        .getExtensionObjectsTypes()
        .toJSArray()
        .indexOf('' /* An empty string means the base object */) !== -1;
    const behaviorTypes = extension
      .getBehaviorsTypes()
      .toJSArray()
      .filter(behaviorType => objectBehaviorTypes.has(behaviorType));

    if (!hasObjectType && !hasBaseObjectType && behaviorTypes.length === 0) {
      continue;
    }

    // const prefix =
    //   extension.getName() === 'BuiltinObject'
    //     ? 'Common ' +
    //       (isCondition ? 'conditions' : 'actions') +
    //       ' for all objects' +
    //       GROUP_DELIMITER
    //     : '';
    const prefix = '';

    //Free instructions
    // allInstructions = [
    //   ...allInstructions,
    //   ...enumerateExtensionInstructions(
    //     prefix,
    //     isCondition ? extension.getAllConditions() : extension.getAllActions()
    //   ),
    // ];

    //Objects instructions:
    if (hasObjectType) {
      allInstructions = [
        ...allInstructions,
        ...enumerateExtensionInstructions(
          prefix,
          isCondition
            ? extension.getAllConditionsForObject(objectType)
            : extension.getAllActionsForObject(objectType)
        ),
      ];
    }

    if (hasBaseObjectType) {
      allInstructions = [
        ...allInstructions,
        ...enumerateExtensionInstructions(
          prefix,
          isCondition
            ? extension.getAllConditionsForObject(
                '' /* An empty string means the base object */
              )
            : extension.getAllActionsForObject(
                '' /* An empty string means the base object */
              )
        ),
      ];
    }

    //Behaviors instructions:
    // eslint-disable-next-line
    behaviorTypes.forEach(behaviorType => {
      allInstructions = [
        ...allInstructions,
        ...enumerateExtensionInstructions(
          prefix,
          isCondition
            ? extension.getAllConditionsForBehavior(behaviorType)
            : extension.getAllActionsForBehavior(behaviorType)
        ),
      ];
    });
  }

  return allInstructions;
};

/**
 * Enumerate all the instructions that are not directly tied
 * to an object.
 *
 * @param {*} isCondition
 */
export const enumerateFreeInstructions = (
  isCondition: boolean
): Array<InstructionOrExpressionInformation> => {
  let allFreeInstructions = [];

  const allExtensions = gd
    .asPlatform(gd.JsPlatform.get())
    .getAllPlatformExtensions();
  for (let i = 0; i < allExtensions.size(); ++i) {
    const extension = allExtensions.get(i);
    const allObjectsTypes = extension.getExtensionObjectsTypes();
    const allBehaviorsTypes = extension.getBehaviorsTypes();

    let prefix = '';
    if (allObjectsTypes.size() > 0 || allBehaviorsTypes.size() > 0) {
      prefix =
        extension.getName() === 'BuiltinObject'
          ? 'Common ' +
            (isCondition ? 'conditions' : 'actions') +
            ' for all objects'
          : extension.getFullName();
      prefix += GROUP_DELIMITER;
    }

    //Free instructions
    allFreeInstructions = [
      ...allFreeInstructions,
      ...enumerateExtensionInstructions(
        prefix,
        isCondition ? extension.getAllConditions() : extension.getAllActions()
      ),
    ];
  }

  return allFreeInstructions;
};
