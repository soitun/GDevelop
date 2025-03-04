const initializeGDevelopJs = require('../../Binaries/embuild/GDevelop.js/libGD.js');
const { makeMinimalGDJSMock } = require('../TestUtils/GDJSMocks.js');
const {
  generateCompiledEventsForLayout,
} = require('../TestUtils/CodeGenerationHelpers.js');

describe('libGD.js - GDJS Code Generation integration tests', function () {
  let gd = null;
  beforeAll(async () => {
    gd = await initializeGDevelopJs();
  });

  let project = null;
  let scene = null;
  beforeEach(() => {
    project = new gd.ProjectHelper.createNewGDJSProject();
    scene = project.insertNewLayout('Scene', 0);
  });
  afterEach(() => {
    project.delete();
  });

  const generateAndRunActionsForLayout = (actions, options = {}) => {
    return generateAndRunEventsForLayout(
      [
        {
          type: 'BuiltinCommonInstructions::Standard',
          conditions: [],
          actions,
          events: [],
        },
      ],
      options
    );
  };

  const generateAndRunVariableAffectationWithConditions = (
    conditions,
    options = {}
  ) => {
    scene.getVariables().insertNew('SuccessVariable', 0).setValue(0);
    return generateAndRunEventsForLayout(
      [
        {
          type: 'BuiltinCommonInstructions::Standard',
          conditions,
          actions: [
            {
              type: { value: 'SetNumberVariable' },
              parameters: ['SuccessVariable', '=', '1'],
            },
          ],
          events: [],
        },
      ],
      options
    );
  };

  const generateAndRunEventsForLayout = (
    events,
    { beforeRunningEvents, logCode } = {}
  ) => {
    const serializedProjectElement = new gd.SerializerElement();
    project.serializeTo(serializedProjectElement);

    const serializedSceneElement = new gd.SerializerElement();
    scene.serializeTo(serializedSceneElement);

    const serializedLayoutEvents = gd.Serializer.fromJSObject(events);
    scene.getEvents().unserializeFrom(project, serializedLayoutEvents);

    const runCompiledEvents = generateCompiledEventsForLayout(
      gd,
      project,
      scene,
      logCode
    );

    const { gdjs, runtimeScene } = makeMinimalGDJSMock({
      gameData: JSON.parse(gd.Serializer.toJSON(serializedProjectElement)),
      sceneData: JSON.parse(gd.Serializer.toJSON(serializedSceneElement)),
    });
    serializedProjectElement.delete();
    serializedSceneElement.delete();

    if (beforeRunningEvents) {
      beforeRunningEvents(runtimeScene);
    }
    runCompiledEvents(gdjs, runtimeScene, []);
    return runtimeScene;
  };

  it('can generate a scene number variable action', function () {
    scene.getVariables().insertNew('MyVariable', 0).setValue(0);
    const runtimeScene = generateAndRunActionsForLayout([
      {
        type: { value: 'SetNumberVariable' },
        parameters: ['MyVariable', '=', '1'],
      },
    ]);
    expect(runtimeScene.getVariables().get('MyVariable').getAsNumber()).toBe(1);
  });

  it('can generate a scene string variable action', function () {
    scene.getVariables().insertNew('MyVariable', 0).setString('');
    const runtimeScene = generateAndRunActionsForLayout([
      {
        type: { value: 'SetStringVariable' },
        parameters: ['MyVariable', '=', '"Hello"'],
      },
    ]);
    expect(runtimeScene.getVariables().get('MyVariable').getAsString()).toBe(
      'Hello'
    );
  });

  it('can generate a scene boolean variable action', function () {
    scene.getVariables().insertNew('MyVariable', 0).setBool(false);
    const runtimeScene = generateAndRunActionsForLayout([
      {
        type: { value: 'SetBooleanVariable' },
        parameters: ['MyVariable', 'True'],
      },
    ]);
    expect(runtimeScene.getVariables().get('MyVariable').getAsBoolean()).toBe(
      true
    );
  });

  it('can generate a scene boolean variable toggle', function () {
    scene.getVariables().insertNew('MyVariable', 0).setBool(false);
    const runtimeScene = generateAndRunActionsForLayout([
      {
        type: { value: 'SetBooleanVariable' },
        parameters: ['MyVariable', 'Toggle'],
      },
    ]);
    expect(runtimeScene.getVariables().get('MyVariable').getAsBoolean()).toBe(
      true
    );
  });

  it('can generate a scene number variable condition that is true', function () {
    scene.getVariables().insertNew('MyVariable', 0).setValue(123);
    const runtimeScene = generateAndRunVariableAffectationWithConditions([
      {
        type: { inverted: false, value: 'NumberVariable' },
        parameters: ['MyVariable', '=', '123'],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a project number variable condition that is true', function () {
    project.getVariables().insertNew('MyVariable', 0).setValue(123);
    const runtimeScene = generateAndRunVariableAffectationWithConditions([
      {
        type: { inverted: false, value: 'NumberVariable' },
        parameters: ['MyVariable', '=', '123'],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a condition giving precedence to the scene variable', function () {
    project.getVariables().insertNew('MyVariable', 0).setValue(123);
    scene.getVariables().insertNew('MyVariable', 0).setValue(456);
    const runtimeScene = generateAndRunVariableAffectationWithConditions([
      {
        type: { inverted: false, value: 'NumberVariable' },
        parameters: ['MyVariable', '=', '456'],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a scene boolean variable condition that checks true', function () {
    scene.getVariables().insertNew('MyVariable', 0).setBool(true);
    const runtimeScene = generateAndRunVariableAffectationWithConditions([
      {
        type: { inverted: false, value: 'BooleanVariable' },
        parameters: ['MyVariable', 'True', ''],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a scene boolean variable condition that checks true (inverted)', function () {
    scene.getVariables().insertNew('MyVariable', 0).setBool(false);
    const runtimeScene = generateAndRunVariableAffectationWithConditions([
      {
        type: { inverted: true, value: 'BooleanVariable' },
        parameters: ['MyVariable', 'True', ''],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a scene boolean variable condition that checks false', function () {
    scene.getVariables().insertNew('MyVariable', 0).setBool(false);
    const runtimeScene = generateAndRunVariableAffectationWithConditions([
      {
        type: { inverted: false, value: 'BooleanVariable' },
        parameters: ['MyVariable', 'False', ''],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a scene boolean variable condition that checks false (inverted)', function () {
    scene.getVariables().insertNew('MyVariable', 0).setBool(true);
    const runtimeScene = generateAndRunVariableAffectationWithConditions([
      {
        type: { inverted: true, value: 'BooleanVariable' },
        parameters: ['MyVariable', 'False', ''],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a scene boolean variable condition that checks false (defaulted from an empty string)', function () {
    scene.getVariables().insertNew('MyVariable', 0).setBool(false);
    const runtimeScene = generateAndRunVariableAffectationWithConditions([
      {
        type: { inverted: false, value: 'BooleanVariable' },
        parameters: ['MyVariable', '', ''],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a scene boolean variable condition that checks false (defaulted from an empty string, inverted)', function () {
    scene.getVariables().insertNew('MyVariable', 0).setBool(true);
    const runtimeScene = generateAndRunVariableAffectationWithConditions([
      {
        type: { inverted: true, value: 'BooleanVariable' },
        parameters: ['MyVariable', '', ''],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a scene string variable condition that is true', function () {
    scene.getVariables().insertNew('MyVariable', 0).setString('Same value');
    const runtimeScene = generateAndRunVariableAffectationWithConditions([
      {
        type: { inverted: false, value: 'StringVariable' },
        parameters: ['MyVariable', '=', '"Same value"'],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a scene string variable condition that is false', function () {
    scene.getVariables().insertNew('MyVariable', 0).setString('Not the same');
    const runtimeScene = generateAndRunVariableAffectationWithConditions([
      {
        type: { inverted: false, value: 'StringVariable' },
        parameters: ['MyVariable', '=', '"Different"'],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(0);
  });

  it('can generate a string variable condition that is true with a contains operator', function () {
    scene.getVariables().insertNew('MyVariable', 0).setString('Hello world!');
    const runtimeScene = generateAndRunVariableAffectationWithConditions([
      {
        type: { inverted: false, value: 'StringVariable' },
        parameters: ['MyVariable', 'contains', '"world"'],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a string variable condition that is false with a contains operator', function () {
    scene.getVariables().insertNew('MyVariable', 0).setString('Hello world!');
    const runtimeScene = generateAndRunVariableAffectationWithConditions([
      {
        type: { inverted: false, value: 'StringVariable' },
        parameters: ['MyVariable', 'contains', '"Hi!"'],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(0);
  });

  it('can generate a push number action', function () {
    scene.getVariables().insertNew('MyVariable', 0).castTo('Array');
    const runtimeScene = generateAndRunActionsForLayout([
      {
        type: { value: 'PushNumber' },
        parameters: ['MyVariable', '123'],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('MyVariable').getChild('0').getAsNumber()
    ).toBe(123);
  });

  it('can generate a push string action', function () {
    scene.getVariables().insertNew('MyVariable', 0).castTo('Array');
    const runtimeScene = generateAndRunActionsForLayout([
      {
        type: { value: 'PushString' },
        parameters: ['MyVariable', '"Hello"'],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('MyVariable').getChild('0').getAsString()
    ).toBe('Hello');
  });

  it('can generate a push boolean action', function () {
    scene.getVariables().insertNew('MyVariable', 0).castTo('Array');
    const runtimeScene = generateAndRunActionsForLayout([
      {
        type: { value: 'PushBoolean' },
        parameters: ['MyVariable', 'True'],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('MyVariable').getChild('0').getAsBoolean()
    ).toBe(true);
  });

  it('can generate a push variable action', function () {
    scene.getVariables().insertNew('MyVariable', 0).castTo('Array');
    scene.getVariables().insertNew('MyOtherVariable', 0).setValue(123);
    const runtimeScene = generateAndRunActionsForLayout([
      {
        type: { value: 'PushVariable' },
        parameters: ['MyVariable', 'MyOtherVariable'],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('MyVariable').getChild('0').getAsNumber()
    ).toBe(123);
  });

  it('can generate a local variable expression', function () {
    scene.getVariables().insertNew('MyVariable', 0).setValue(0);
    const runtimeScene = generateAndRunEventsForLayout([
      {
        type: 'BuiltinCommonInstructions::Standard',
        variables: [{ name: 'MyLocalVariable', type: 'number', value: 123 }],
        conditions: [],
        actions: [
          {
            type: { value: 'SetNumberVariable' },
            parameters: ['MyVariable', '=', 'MyLocalVariable'],
          },
        ],
        events: [],
      },
    ]);
    expect(runtimeScene.getVariables().get('MyVariable').getAsNumber()).toBe(
      123
    );
  });

  it('can generate a local variable condition', function () {
    scene.getVariables().insertNew('SuccessVariable', 0).setValue(0);
    const runtimeScene = generateAndRunEventsForLayout([
      {
        type: 'BuiltinCommonInstructions::Standard',
        variables: [{ name: 'MyLocalVariable', type: 'number', value: 123 }],
        conditions: [
          {
            type: { inverted: false, value: 'NumberVariable' },
            parameters: ['MyLocalVariable', '=', '123'],
          },
        ],
        actions: [
          {
            type: { value: 'SetNumberVariable' },
            parameters: ['SuccessVariable', '=', '1'],
          },
        ],
        events: [],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a local child-variable condition on a structure', function () {
    scene.getVariables().insertNew('SuccessVariable', 0).setValue(0);
    const runtimeScene = generateAndRunEventsForLayout([
      {
        type: 'BuiltinCommonInstructions::Standard',
        variables: [
          {
            name: 'MyLocalVariable',
            type: 'structure',
            children: [{ name: 'MyChild', type: 'number', value: 123 }],
          },
        ],
        conditions: [
          {
            type: { inverted: false, value: 'NumberVariable' },
            parameters: ['MyLocalVariable.MyChild', '=', '123'],
          },
        ],
        actions: [
          {
            type: { value: 'SetNumberVariable' },
            parameters: ['SuccessVariable', '=', '1'],
          },
        ],
        events: [],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a local child-variable condition on an array', function () {
    scene.getVariables().insertNew('SuccessVariable', 0).setValue(0);
    const runtimeScene = generateAndRunEventsForLayout([
      {
        type: 'BuiltinCommonInstructions::Standard',
        variables: [
          {
            name: 'MyLocalVariable',
            type: 'array',
            children: [{ name: '0', type: 'number', value: 123 }],
          },
        ],
        conditions: [
          {
            type: { inverted: false, value: 'NumberVariable' },
            parameters: ['MyLocalVariable[0]', '=', '123'],
          },
        ],
        actions: [
          {
            type: { value: 'SetNumberVariable' },
            parameters: ['SuccessVariable', '=', '1'],
          },
        ],
        events: [],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a local variable condition giving precedence to the closest local variable', function () {
    scene.getVariables().insertNew('SuccessVariable', 0).setValue(0);

    project.getVariables().insertNew('MyVariable', 0).setValue(123);
    scene.getVariables().insertNew('MyVariable', 0).setValue(456);
    const runtimeScene = generateAndRunEventsForLayout([
      {
        type: 'BuiltinCommonInstructions::Standard',
        variables: [{ name: 'MyVariable', type: 'number', value: 789 }],
        conditions: [],
        actions: [],
        events: [
          {
            type: 'BuiltinCommonInstructions::Standard',
            variables: [
              { name: 'MyVariable', type: 'number', value: 147 },
            ],
            conditions: [
              {
                type: { inverted: false, value: 'NumberVariable' },
                parameters: ['MyVariable', '=', '147'],
              },
            ],
            actions: [
              {
                type: { value: 'SetNumberVariable' },
                parameters: ['SuccessVariable', '=', '1'],
              },
            ],
            events: [],
          },
        ],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a local variable without affecting parent event local variables', function () {
    scene.getVariables().insertNew('SuccessVariable', 0).setValue(0);

    project.getVariables().insertNew('MyVariable', 0).setValue(123);
    scene.getVariables().insertNew('MyVariable', 0).setValue(456);
    const runtimeScene = generateAndRunEventsForLayout([
      {
        type: 'BuiltinCommonInstructions::Standard',
        variables: [{ name: 'MyLocalVariable', type: 'number', value: 789 }],
        conditions: [],
        actions: [],
        events: [
          // Create a new local variable with the same name.
          {
            type: 'BuiltinCommonInstructions::Standard',
            variables: [
              { name: 'MyLocalVariable', type: 'number', value: 147 },
            ],
            conditions: [],
            actions: [
              {
                type: { value: 'SetNumberVariable' },
                parameters: ['MyLocalVariable', '=', '148'],
              },
            ],
          },
          // The local variable must be untouched by the previous event.
          {
            type: 'BuiltinCommonInstructions::Standard',
            conditions: [
              {
                type: { inverted: false, value: 'NumberVariable' },
                parameters: ['MyLocalVariable', '=', '789'],
              },
            ],
            actions: [
              {
                type: { value: 'SetNumberVariable' },
                parameters: ['SuccessVariable', '=', '1'],
              },
            ],
          },
        ],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a condition on a local variable from a parent event', function () {
    scene.getVariables().insertNew('SuccessVariable', 0).setValue(0);
    const runtimeScene = generateAndRunEventsForLayout([
      {
        type: 'BuiltinCommonInstructions::Standard',
        variables: [{ name: 'MyLocalVariable', type: 'number', value: 123 }],
        conditions: [],
        actions: [],
        events: [
          {
            type: 'BuiltinCommonInstructions::Standard',
            variables: [],
            conditions: [
              {
                type: { inverted: false, value: 'NumberVariable' },
                parameters: ['MyLocalVariable', '=', '123'],
              },
            ],
            actions: [
              {
                type: { value: 'SetNumberVariable' },
                parameters: ['SuccessVariable', '=', '1'],
              },
            ],
            events: [],
          },
        ],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a VariableChildCount expression', function () {
    scene.getVariables().insertNew('MyVariable', 0).setValue(0);
    scene
      .getVariables()
      .insertNew('MyStructureVariable', 0)
      .getChild('MyChild')
      .setValue(123);
    const runtimeScene = generateAndRunActionsForLayout([
      {
        type: { value: 'SetNumberVariable' },
        parameters: [
          'MyVariable',
          '=',
          'VariableChildCount(MyStructureVariable)',
        ],
      },
    ]);
    expect(runtimeScene.getVariables().get('MyVariable').getAsNumber()).toBe(1);
  });

  // TODO Move this test with legacy ones.
  it('can generate a VariableChildCount expression for an undeclared variable', function () {
    scene.getVariables().insertNew('MyVariable', 0).setValue(0);
    const runtimeScene = generateAndRunActionsForLayout(
      [
        {
          type: { value: 'SetNumberVariable' },
          parameters: [
            'MyVariable',
            '=',
            'VariableChildCount(MyStructureVariable)',
          ],
        },
      ],
      {
        beforeRunningEvents: (runtimeScene) => {
          runtimeScene
            .getVariables()
            .get('MyStructureVariable')
            .getChild('MyChild')
            .setValue(123);
        },
      }
    );
    expect(runtimeScene.getVariables().get('MyVariable').getAsNumber()).toBe(1);
  });

  it('can generate a child existence condition that is true', function () {
    scene
      .getVariables()
      .insertNew('MyStructureVariable', 0)
      .getChild('MyChild')
      .setValue(123);
    const runtimeScene = generateAndRunVariableAffectationWithConditions([
      {
        type: { inverted: false, value: 'VariableChildExists2' },
        parameters: ['MyStructureVariable', '"MyChild"'],
      },
    ]);
    expect(
      runtimeScene.getVariables().get('SuccessVariable').getAsNumber()
    ).toBe(1);
  });

  it('can generate a child removing action', function () {
    const variable = scene.getVariables().insertNew('MyStructureVariable', 0);
    variable.getChild('MyChildA').setValue(123);
    variable.getChild('MyChildB').setValue(456);
    const runtimeScene = generateAndRunActionsForLayout([
      {
        type: { value: 'RemoveVariableChild' },
        parameters: ['MyStructureVariable', '"MyChildA"'],
      },
    ]);
    expect(
      runtimeScene
        .getVariables()
        .get('MyStructureVariable')
        .hasChild('MyChildA')
    ).toBe(false);
    expect(
      runtimeScene
        .getVariables()
        .get('MyStructureVariable')
        .hasChild('MyChildB')
    ).toBe(true);
  });

  it('can generate a children clearing action', function () {
    const variable = scene.getVariables().insertNew('MyStructureVariable', 0);
    variable.getChild('MyChildA').setValue(123);
    variable.getChild('MyChildB').setValue(123);
    const runtimeScene = generateAndRunActionsForLayout([
      {
        type: { value: 'ClearVariableChildren' },
        parameters: ['MyStructureVariable'],
      },
    ]);
    expect(
      runtimeScene
        .getVariables()
        .get('MyStructureVariable')
        .hasChild('MyChildA')
    ).toBe(false);
    expect(
      runtimeScene
        .getVariables()
        .get('MyStructureVariable')
        .hasChild('MyChildB')
    ).toBe(false);
  });

  it('can generate a "for each child variable" event with scene variables', function () {
    scene.getVariables().insertNew('Counter', 0).setValue(0);
    scene.getVariables().insertNew('child', 0).setValue(0);
    {
      const structure = scene.getVariables().insertNew('MyVariable', 0);
      for (let index = 1; index <= 4; index++) {
        structure.getChild('Child' + index).setValue(index);
      }
    }
    const runtimeScene = generateAndRunEventsForLayout(
      [
        {
          type: 'BuiltinCommonInstructions::ForEachChildVariable',
          iterableVariableName: 'MyVariable',
          valueIteratorVariableName: 'child',
          keyIteratorVariableName: '',
          conditions: [],
          actions: [
            {
              type: { value: 'SetNumberVariable' },
              parameters: ['Counter', '+', 'child'],
            },
          ],
          events: [],
        },
      ],
      {
        logCode: true,
      }
    );
    expect(runtimeScene.getVariables().has('Counter')).toBe(true);
    expect(runtimeScene.getVariables().get('Counter').getAsNumber()).toBe(
      1 + 2 + 3 + 4
    );
  });

  it('can generate a "for each child variable" event with local variables', function () {
    scene.getVariables().insertNew('Counter', 0).setValue(0);
    const runtimeScene = generateAndRunEventsForLayout(
      [
        {
          type: 'BuiltinCommonInstructions::Standard',
          variables: [
            {
              name: 'MyVariable',
              type: 'structure',
              children: [
                { name: 'Child1', type: 'number', value: 1 },
                { name: 'Child2', type: 'number', value: 2 },
                { name: 'Child3', type: 'number', value: 3 },
                { name: 'Child4', type: 'number', value: 4 },
              ],
            },
            { name: 'child', type: 'number', value: 0 },
          ],

          conditions: [],
          actions: [],
          events: [
            {
              type: 'BuiltinCommonInstructions::ForEachChildVariable',
              iterableVariableName: 'MyVariable',
              valueIteratorVariableName: 'child',
              keyIteratorVariableName: '',
              conditions: [],
              actions: [
                {
                  type: { value: 'SetNumberVariable' },
                  parameters: ['Counter', '+', 'child'],
                },
              ],
              events: [],
            },
          ],
        },
      ],
      {
        logCode: true,
      }
    );
    expect(runtimeScene.getVariables().has('Counter')).toBe(true);
    expect(runtimeScene.getVariables().get('Counter').getAsNumber()).toBe(
      1 + 2 + 3 + 4
    );
  });

  it('can generate a nested "for each child variable" event', function () {
    scene.getVariables().insertNew('Counter', 0).setValue(0);
    scene.getVariables().insertNew('childA', 0).setValue(0);
    scene.getVariables().insertNew('childB', 0).setValue(0);
    {
      const structure = scene.getVariables().insertNew('MyVariableA', 0);
      for (let index = 1; index <= 4; index++) {
        structure.getChild('Child' + index).setValue(index);
      }
    }
    {
      const structure = scene.getVariables().insertNew('MyVariableB', 0);
      for (let index = 5; index <= 7; index++) {
        structure.getChild('Child' + index).setValue(index);
      }
    }
    const runtimeScene = generateAndRunEventsForLayout([
      {
        type: 'BuiltinCommonInstructions::ForEachChildVariable',
        iterableVariableName: 'MyVariableA',
        valueIteratorVariableName: 'childA',
        keyIteratorVariableName: '',
        conditions: [],
        actions: [],
        events: [
          {
            type: 'BuiltinCommonInstructions::ForEachChildVariable',
            iterableVariableName: 'MyVariableB',
            valueIteratorVariableName: 'childB',
            keyIteratorVariableName: '',
            conditions: [],
            actions: [
              {
                type: { value: 'SetNumberVariable' },
                parameters: ['Counter', '+', 'childA * childB'],
              },
            ],
            events: [],
          },
        ],
      },
    ]);
    expect(runtimeScene.getVariables().has('Counter')).toBe(true);
    expect(runtimeScene.getVariables().get('Counter').getAsNumber()).toBe(
      (1 + 2 + 3 + 4) * (5 + 6 + 7)
    );
  });

  it('can generate a "for each child variable" event with objects used in iterable expression', function () {
    scene.getVariables().insertNew('Counter', 0).setValue(0);
    scene.getVariables().insertNew('child', 0).setValue(0);
    {
      const structure = scene
        .getVariables()
        .insertNew('MyVariable', 0)
        .getChild('Foo');
      for (let index = 1; index <= 4; index++) {
        structure.getChild('Child' + index).setValue(index);
      }
    }
    {
      const object = scene
        .getObjects()
        .insertNewObject(project, 'Sprite', 'MyObject', 0);
      object.getVariables().insertNew('MyObjectVariable', 0).setString('Foo');
      const instance = scene.getInitialInstances().insertNewInitialInstance();
      instance.setObjectName('MyObject');
    }
    const runtimeScene = generateAndRunEventsForLayout(
      [
        {
          type: 'BuiltinCommonInstructions::ForEachChildVariable',
          iterableVariableName: 'MyVariable[MyObject.MyObjectVariable]',
          valueIteratorVariableName: 'child',
          keyIteratorVariableName: '',
          conditions: [],
          actions: [
            {
              type: { value: 'SetNumberVariable' },
              parameters: ['Counter', '+', 'child'],
            },
          ],
          events: [],
        },
      ],
      {
        logCode: true,
      }
    );
    expect(runtimeScene.getVariables().has('Counter')).toBe(true);
    expect(runtimeScene.getVariables().get('Counter').getAsNumber()).toBe(
      1 + 2 + 3 + 4
    );
  });
});
