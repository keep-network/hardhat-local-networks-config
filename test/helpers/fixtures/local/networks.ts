module.exports = {
  defaultConfig: {
    url: 'https://default-from-local',
    someDefaultValue: 'def2',
  },
  networks: {
    shouldNotBeOverridden: {},
    shouldBeExtended: {
      a: 100,
      b: 'b',
      c: false,
    },
    shouldBePartiallyExtended: {
      a: 100,
      d: 'tc33',
      f: 'tc63',
      g: 'tc73',
    },
    shouldBeCopiedFromLocalConfig: {
      x: 'a',
      y: 2,
      z: true,
    },
  },
}