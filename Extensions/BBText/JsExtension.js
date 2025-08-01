//@ts-check
/// <reference path="../JsExtensionTypes.d.ts" />
/**
 * This is a declaration of an extension for GDevelop 5.
 *
 * ℹ️ Changes in this file are watched and automatically imported if the editor
 * is running. You can also manually run `node import-GDJS-Runtime.js` (in newIDE/app/scripts).
 *
 * The file must be named "JsExtension.js", otherwise GDevelop won't load it.
 * ⚠️ If you make a change and the extension is not loaded, open the developer console
 * and search for any errors.
 *
 * More information on https://github.com/4ian/GDevelop/blob/master/newIDE/README-extensions.md
 */

const stringifyOptions = (options) => '["' + options.join('","') + '"]';

/** @type {ExtensionModule} */
module.exports = {
  createExtension: function (_, gd) {
    const extension = new gd.PlatformExtension();
    extension
      .setExtensionInformation(
        'BBText',
        _('BBCode Text Object'),
        'A BBText is an object displaying on the screen a rich text formatted using BBCode markup (allowing to set parts of the text as bold, italic, use different colors and shadows).',
        'Todor Imreorov',
        'Open source (MIT License)'
      )
      .setExtensionHelpPath('/objects/bbtext')
      .setCategory('Text');
    extension
      .addInstructionOrExpressionGroupMetadata(_('BBCode Text Object'))
      .setIcon('JsPlatform/Extensions/bbcode32.png');

    var objectBBText = new gd.ObjectJsImplementation();
    objectBBText.updateProperty = function (propertyName, newValue) {
      const objectContent = this.content;
      if (propertyName in objectContent) {
        if (typeof objectContent[propertyName] === 'boolean')
          objectContent[propertyName] = newValue === '1';
        else if (typeof objectContent[propertyName] === 'number')
          objectContent[propertyName] = parseFloat(newValue);
        else objectContent[propertyName] = newValue;
        return true;
      }

      return false;
    };
    objectBBText.getProperties = function () {
      const objectProperties = new gd.MapStringPropertyDescriptor();
      const objectContent = this.content;

      objectProperties
        .getOrCreate('text')
        .setValue(objectContent.text)
        .setType('multilinestring')
        .setLabel(_('BBCode text'));

      objectProperties
        .getOrCreate('color')
        .setValue(objectContent.color)
        .setType('color')
        .setLabel(_('Base color'))
        .setGroup(_('Appearance'));

      objectProperties
        .getOrCreate('fontSize')
        .setValue(objectContent.fontSize.toString())
        .setType('number')
        .setLabel(_('Base size'))
        .setGroup(_('Font'));

      objectProperties
        .getOrCreate('align')
        .setValue(objectContent.align)
        .setType('choice')
        .addChoice('left', _('Left'))
        .addChoice('center', _('Center'))
        .addChoice('right', _('Right'))
        .setLabel(_('Base alignment'))
        .setGroup(_('Appearance'));

      if (!objectContent.verticalTextAlignment) {
        objectContent.verticalTextAlignment = 'top';
      }
      objectProperties
        .getOrCreate('verticalTextAlignment')
        .setValue(objectContent.verticalTextAlignment)
        .setType('choice')
        .addChoice('top', _('Top'))
        .addChoice('center', _('Center'))
        .addChoice('bottom', _('Bottom'))
        .setLabel(_('Vertical alignment'))
        .setGroup(_('Appearance'));

      objectProperties
        .getOrCreate('fontFamily')
        .setValue(objectContent.fontFamily)
        .setType('resource')
        .addExtraInfo('font')
        .setLabel(_('Font'))
        .setGroup(_('Font'));

      objectProperties
        .getOrCreate('visible')
        .setValue(objectContent.visible ? 'true' : 'false')
        .setType('boolean')
        .setLabel(_('Visible on start'))
        .setGroup(_('Appearance'));

      return objectProperties;
    };
    objectBBText.content = {
      text: '[b]bold[/b] [i]italic[/i] [size=15]smaller[/size] [font=times]times[/font] font\n[spacing=12]spaced out[/spacing]\n[outline=yellow]outlined[/outline] [shadow=red]DropShadow[/shadow] ',
      opacity: 255,
      fontSize: 20,
      visible: true,
      color: '0;0;0',
      fontFamily: 'Arial',
      align: 'left',
      verticalTextAlignment: 'top',
    };

    objectBBText.updateInitialInstanceProperty = function (
      instance,
      propertyName,
      newValue
    ) {
      return false;
    };
    objectBBText.getInitialInstanceProperties = function (instance) {
      var instanceProperties = new gd.MapStringPropertyDescriptor();
      return instanceProperties;
    };

    const object = extension
      .addObject(
        'BBText',
        _('BBText'),
        _(
          'Displays a rich text label using BBCode markup (allowing to set parts of the text as bold, italic, use different colors and shadows).'
        ),
        'JsPlatform/Extensions/bbcode32.png',
        objectBBText
      )
      .setIncludeFile('Extensions/BBText/bbtextruntimeobject.js')
      .addIncludeFile('Extensions/BBText/bbtextruntimeobject-pixi-renderer.js')
      .addIncludeFile(
        'Extensions/BBText/pixi-multistyle-text/dist/pixi-multistyle-text.umd.js'
      )
      .setCategoryFullName(_('Text'))
      .addDefaultBehavior('EffectCapability::EffectBehavior')
      .addDefaultBehavior('OpacityCapability::OpacityBehavior');

    /**
     * Utility function to add both a setter and a getter to a property from a list.
     * Useful for setting multiple generic properties.
     */
    const addSettersAndGettersToObject = (gdObject, properties, objectName) => {
      properties.forEach((property) => {
        const parameterType =
          property.type === 'boolean' ? 'yesorno' : property.type;

        // Add the expression
        if (parameterType === 'number') {
          gdObject
            .addExpression(
              `Get${property.functionName}`,
              property.expressionLabel,
              property.expressionDescription,
              '',
              property.iconPath
            )
            .addParameter('object', objectName, objectName, false)
            .getCodeExtraInformation()
            .setFunctionName(`get${property.functionName}`);
        } else if (
          parameterType === 'string' ||
          parameterType === 'stringWithSelector'
        ) {
          gdObject
            .addStrExpression(
              `Get${property.functionName}`,
              property.expressionLabel,
              property.expressionDescription,
              '',
              property.iconPath
            )
            .addParameter('object', objectName, objectName, false)
            .getCodeExtraInformation()
            .setFunctionName(`get${property.functionName}`);
        }

        // Add the action
        if (
          parameterType === 'number' ||
          parameterType === 'string' ||
          parameterType === 'stringWithSelector'
        ) {
          const parameterOptions =
            gd.ParameterOptions.makeNewOptions().setDescription(
              property.paramLabel
            );
          if (property.options) {
            parameterOptions.setTypeExtraInfo(
              stringifyOptions(property.options)
            );
          }
          gdObject
            .addAction(
              `Set${property.functionName}`,
              property.instructionLabel,
              property.actionDescription,
              property.actionSentence,
              '',
              property.iconPath,
              property.iconPath
            )
            .addParameter('object', objectName, objectName, false)
            .useStandardOperatorParameters(parameterType, parameterOptions)
            .getCodeExtraInformation()
            .setFunctionName(`set${property.functionName}`)
            .setGetter(`get${property.functionName}`);
        } else {
          gdObject
            .addAction(
              `Set${property.functionName}`,
              property.instructionLabel,
              property.actionDescription,
              property.actionSentence,
              '',
              property.iconPath,
              property.iconPath
            )
            .addParameter('object', objectName, objectName, false)
            .addParameter(
              parameterType,
              property.paramLabel,
              '', // There should not be options for the property if it's not a stringWithSelector
              false
            )
            .getCodeExtraInformation()
            .setFunctionName(`set${property.functionName}`)
            .setGetter(`get${property.functionName}`);
        }

        // Add condition
        if (
          parameterType === 'string' ||
          parameterType === 'number' ||
          parameterType === 'stringWithSelector'
        ) {
          const parameterOptions =
            gd.ParameterOptions.makeNewOptions().setDescription(
              property.paramLabel
            );
          if (property.options) {
            parameterOptions.setTypeExtraInfo(
              stringifyOptions(property.options)
            );
          }
          gdObject
            .addCondition(
              `Is${property.functionName}`,
              property.instructionLabel,
              property.conditionDescription,
              property.conditionSentence,
              '',
              property.iconPath,
              property.iconPath
            )
            .addParameter('object', objectName, objectName, false)
            .useStandardRelationalOperatorParameters(
              parameterType,
              parameterOptions
            )
            .getCodeExtraInformation()
            .setFunctionName(`get${property.functionName}`);
        } else if (parameterType === 'yesorno') {
          gdObject
            .addCondition(
              `Is${property.functionName}`,
              property.instructionLabel,
              property.conditionDescription,
              property.conditionSentence,
              '',
              property.iconPath,
              property.iconPath
            )
            .addParameter('object', objectName, objectName, false)
            .getCodeExtraInformation()
            .setFunctionName(`get${property.functionName}`);
        }
      });
    };

    const setterAndGetterProperties = [
      {
        functionName: 'BBText',
        iconPath: 'res/actions/text24_black.png',
        type: 'string',
        instructionLabel: _('BBCode text'),
        paramLabel: _('Text'),
        conditionDescription: _('Compare the value of the BBCode text.'),
        conditionSentence: _('the BBCode text'),
        actionDescription: _('Set BBCode text'),
        actionSentence: _('the BBCode text'),
        expressionLabel: _('Get BBCode text'),
        expressionDescription: _('Get BBCode text'),
      },
      {
        functionName: 'Color',
        iconPath: 'res/actions/color24.png',
        type: 'color',
        instructionLabel: _('Color'),
        paramLabel: _('Color (R;G;B)'),
        conditionDescription: '', // No conditions for a "color" property
        conditionSentence: '', // No conditions for a "color" property
        actionDescription: _('Set base color'),
        actionSentence: _('Set base color of _PARAM0_ to _PARAM1_'),
        expressionLabel: '', // No expression for a "color" property
        expressionDescription: '', // No expression for a "color" property
      },
      {
        functionName: 'Opacity',
        iconPath: 'res/actions/opacity24.png',
        type: 'number',
        instructionLabel: _('Opacity'),
        paramLabel: _('Opacity (0-255)'),
        conditionDescription: _(
          'Compare the value of the base opacity of the text.'
        ),
        conditionSentence: _('the base opacity'),
        actionDescription: _('Set base opacity'),
        actionSentence: _('the base opacity'),
        expressionLabel: _('Get the base opacity'),
        expressionDescription: _('Get the base opacity'),
      },
      {
        functionName: 'FontSize',
        iconPath: 'res/actions/characterSize24.png',
        type: 'number',
        instructionLabel: _('Font size'),
        paramLabel: _('Font size'),
        conditionDescription: _('Compare the base font size of the text.'),
        conditionSentence: _('the base font size'),
        actionDescription: _('Set base font size'),
        actionSentence: _('the base font size'),
        expressionLabel: _('Get the base font size'),
        expressionDescription: _('Get the base font size'),
      },
      {
        functionName: 'FontFamily',
        iconPath: 'res/actions/font24.png',
        type: 'string',
        instructionLabel: _('Font family'),
        paramLabel: _('Font family'),
        conditionDescription: _('Compare the value of font family'),
        conditionSentence: _('the base font family'),
        actionDescription: _('Set font family'),
        actionSentence: _('the base font family'),
        expressionLabel: _('Get the base font family'),
        expressionDescription: _('Get the base font family'),
      },
      {
        functionName: 'Alignment',
        iconPath: 'res/actions/textAlign24.png',
        type: 'stringWithSelector',
        instructionLabel: _('Alignment'),
        paramLabel: _('Alignment'),
        options: ['left', 'right', 'center'],
        conditionDescription: _('Check the current text alignment.'),
        conditionSentence: _('The text alignment of _PARAM0_ is _PARAM1_'),
        actionDescription: _('Change the alignment of the text.'),
        actionSentence: _('text alignment'),
        expressionLabel: _('Get the text alignment'),
        expressionDescription: _('Get the text alignment'),
      },
      {
        functionName: 'WrappingWidth',
        iconPath: 'res/actions/scaleWidth24_black.png',
        type: 'number',
        instructionLabel: _('Wrapping width'),
        paramLabel: _('Wrapping width'),
        conditionDescription: _(
          'Compare the width, in pixels, after which the text is wrapped on next line.'
        ),
        conditionSentence: _('the wrapping width'),
        actionDescription: _(
          'Change the width, in pixels, after which the text is wrapped on next line.'
        ),
        actionSentence: _('the wrapping width'),
        expressionLabel: _('Get the wrapping width'),
        expressionDescription: _('Get the wrapping width'),
      },
    ];

    addSettersAndGettersToObject(object, setterAndGetterProperties, 'BBText');

    object
      .addCondition(
        'IsWordWrap',
        _('Word wrapping'),
        _('Check if word wrapping is enabled.'),
        _('_PARAM0_ word wrapping is enabled'),
        '',
        'res/conditions/wordWrap24_black.png',
        'res/conditions/wordWrap_black.png'
      )
      .addParameter('object', 'BBText', 'BBText', false)
      .getCodeExtraInformation()
      .setFunctionName('isWrapping');

    object
      .addAction(
        'SetWordWrap',
        _('Word wrapping'),
        _('De/activate word wrapping.'),
        _('Activate word wrapping of _PARAM0_: _PARAM1_'),
        '',
        'res/actions/wordWrap24_black.png',
        'res/actions/wordWrap_black.png'
      )
      .addParameter('object', 'BBText', 'BBText', false)
      .addParameter('yesorno', _('Activate word wrapping'), '', false)
      .getCodeExtraInformation()
      .setFunctionName('setWrapping');

    object
      .addAction(
        `SetFontFamily2`,
        _('Font family'),
        _('Set font family'),
        _('Set the font of _PARAM0_ to _PARAM1_'),
        '',
        'res/actions/font24.png',
        'res/actions/font24.png'
      )
      .addParameter('object', 'BBText', 'BBText', false)
      .addParameter('fontResource', _('Font family'), '', false)
      .getCodeExtraInformation()
      .setFunctionName(`setFontFamily`);

    const actions = object.getAllActions();
    const conditions = object.getAllConditions();
    const expressions = object.getAllExpressions();

    actions.get('BBText::SetOpacity').setHidden();
    conditions.get('BBText::IsOpacity').setHidden();
    expressions.get('GetOpacity').setHidden();
    // Action deprecated because it's using the `string` type instead of the more
    // user-friendly `fontResource` type.
    actions.get('BBText::SetFontFamily').setHidden();

    return extension;
  },

  /**
   * You can optionally add sanity tests that will check the basic working
   * of your extension behaviors/objects by instantiating behaviors/objects
   * and setting the property to a given value.
   *
   * If you don't have any tests, you can simply return an empty array.
   *
   * But it is recommended to create tests for the behaviors/objects properties you created
   * to avoid mistakes.
   */
  runExtensionSanityTests: function (gd, extension) {
    return [];
  },
  /**
   * Register editors for objects.
   *
   * ℹ️ Run `node import-GDJS-Runtime.js` (in newIDE/app/scripts) if you make any change.
   */
  registerEditorConfigurations: function (objectsEditorService) {
    objectsEditorService.registerEditorConfiguration(
      'BBText::BBText',
      objectsEditorService.getDefaultObjectJsImplementationPropertiesEditor({
        helpPagePath: '/objects/bbtext',
      })
    );
  },
  /**
   * Register renderers for instance of objects on the scene editor.
   *
   * ℹ️ Run `node import-GDJS-Runtime.js` (in newIDE/app/scripts) if you make any change.
   */
  registerInstanceRenderers: function (objectsRenderingService) {
    const RenderedInstance = objectsRenderingService.RenderedInstance;
    const MultiStyleText = objectsRenderingService.requireModule(
      __dirname,
      'pixi-multistyle-text/dist/pixi-multistyle-text.umd'
    );

    /**
     * Renderer for instances of BBText inside the IDE.
     *
     * @extends RenderedInstance
     * @class RenderedBBTextInstance
     * @constructor
     */
    class RenderedBBTextInstance extends RenderedInstance {
      constructor(
        project,
        instance,
        associatedObjectConfiguration,
        pixiContainer,
        pixiResourcesLoader,
        getPropertyOverridings
      ) {
        super(
          project,
          instance,
          associatedObjectConfiguration,
          pixiContainer,
          pixiResourcesLoader,
          getPropertyOverridings
        );

        const bbTextStyles = {
          default: {
            // Use a default font family the time for the resource font to be loaded.
            fontFamily: 'Arial',
            fontSize: '24px',
            fill: '#cccccc',
            tagStyle: 'bbcode',
            wordWrapWidth: 250, // This value is the default wrapping width of the runtime object.
            align: 'left',
          },
        };

        this._pixiObject = new MultiStyleText('', bbTextStyles);

        this._pixiObject.anchor.x = 0.5;
        this._pixiObject.anchor.y = 0.5;
        this._pixiContainer.addChild(this._pixiObject);
        this.update();
      }

      /**
       * Return the path to the thumbnail of the specified object.
       */
      static getThumbnail(project, resourcesLoader, objectConfiguration) {
        return 'JsPlatform/Extensions/bbcode24.png';
      }

      /**
       * This is called to update the PIXI object on the scene editor
       */
      update() {
        const object = gd.castObject(
          this._associatedObjectConfiguration,
          gd.ObjectJsImplementation
        );

        const propertyOverridings = this.getPropertyOverridings();
        const rawText =
          propertyOverridings && propertyOverridings.has('Text')
            ? propertyOverridings.get('Text')
            : object.content.text;
        if (rawText !== this._pixiObject.text) {
          this._pixiObject.text = rawText;
        }

        const color = object.content.color;
        const newColor = objectsRenderingService.rgbOrHexToHexNumber(color);
        if (newColor !== this._pixiObject.textStyles.default.fill) {
          this._pixiObject.textStyles.default.fill = newColor;
          this._pixiObject.dirty = true;
        }

        const fontSize = object.content.fontSize;
        const newDefaultFontsize = `${fontSize}px`;
        if (
          newDefaultFontsize !== this._pixiObject.textStyles.default.fontSize
        ) {
          this._pixiObject.textStyles.default.fontSize = `${fontSize}px`;
          this._pixiObject.dirty = true;
        }

        const fontResourceName = object.content.fontFamily;

        if (this._fontResourceName !== fontResourceName) {
          this._fontResourceName = fontResourceName;

          this._pixiResourcesLoader
            .loadFontFamily(this._project, fontResourceName)
            .then((fontFamily) => {
              // Once the font is loaded, we can use the given fontFamily.
              this._pixiObject.textStyles.default.fontFamily = fontFamily;
              this._pixiObject.dirty = true;
            })
            .catch((err) => {
              // Ignore errors
              console.warn(
                'Unable to load font family for RenderedBBTextInstance',
                err
              );
            });
        }

        const wordWrap = this._instance.hasCustomSize();
        if (wordWrap !== this._pixiObject._style.wordWrap) {
          this._pixiObject._style.wordWrap = wordWrap;
          this._pixiObject.dirty = true;
        }
        if (this._instance.hasCustomSize()) {
          const customWidth = this.getCustomWidth();
          if (this._pixiObject._style.wordWrapWidth !== customWidth) {
            this._pixiObject._style.wordWrapWidth = customWidth;
            this._pixiObject.dirty = true;
          }
        }

        const align = object.content.align;
        if (align !== this._pixiObject._style.align) {
          this._pixiObject._style.align = align;
          this._pixiObject.dirty = true;
        }

        if (this._instance.hasCustomSize() && this._pixiObject.width !== 0) {
          const alignmentX =
            object.content.align === 'right'
              ? 1
              : object.content.align === 'center'
                ? 0.5
                : 0;

          const width = this.getCustomWidth();

          // A vector from the custom size center to the renderer center.
          const centerToCenterX =
            (width - this._pixiObject.width) * (alignmentX - 0.5);

          this._pixiObject.position.x = this._instance.getX() + width / 2;
          this._pixiObject.anchor.x =
            0.5 - centerToCenterX / this._pixiObject.width;
        } else {
          this._pixiObject.position.x =
            this._instance.getX() + this._pixiObject.width / 2;
          this._pixiObject.anchor.x = 0.5;
        }
        const alignmentY =
          object.content.verticalTextAlignment === 'bottom'
            ? 1
            : object.content.verticalTextAlignment === 'center'
              ? 0.5
              : 0;
        this._pixiObject.position.y =
          this._instance.getY() + this._pixiObject.height * (0.5 - alignmentY);
        this._pixiObject.anchor.y = 0.5;

        this._pixiObject.rotation = RenderedInstance.toRad(
          this._instance.getAngle()
        );

        // Do not hide completely an object so it can still be manipulated
        const alphaForDisplay = Math.max(
          this._instance.getOpacity() / 255,
          0.5
        );
        this._pixiObject.alpha = alphaForDisplay;
      }

      /**
       * Return the width of the instance, when it's not resized.
       */
      getDefaultWidth() {
        return this._pixiObject.width;
      }

      /**
       * Return the height of the instance, when it's not resized.
       */
      getDefaultHeight() {
        return this._pixiObject.height;
      }

      getOriginY() {
        const object = gd.castObject(
          this._associatedObjectConfiguration,
          gd.ObjectJsImplementation
        );
        const height = this.getHeight();
        return object.content.verticalTextAlignment === 'bottom'
          ? height
          : object.content.verticalTextAlignment === 'center'
            ? height / 2
            : 0;
      }
    }

    objectsRenderingService.registerInstanceRenderer(
      'BBText::BBText',
      RenderedBBTextInstance
    );
  },
};
