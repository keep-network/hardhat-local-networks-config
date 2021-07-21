import { assert } from 'chai'
import { HardhatPluginError } from 'hardhat/plugins'
import { resetHardhatContext } from 'hardhat/plugins-testing'
import { useEnvironment } from './helpers'
import path from 'path'
// tslint:disable-next-line
const mock = require('mock-os')

const DEFAULTS = {
  accounts: 'remote',
  gas: 'auto',
  gasMultiplier: 1,
  gasPrice: 'auto',
  httpHeaders: {},
  timeout: 20000
}

describe('local networks config plugin', function() {
  describe('when there is invalid local config path', () => {
    useEnvironment('invalid-config')

    it('should not override any network config', function() {
      Object.entries(this.userNetworks).forEach(([networkName, userNetworkConfig]) => {
        const expectedConfig = Object.assign({}, DEFAULTS, userNetworkConfig);
        assert.deepStrictEqual(this.resolvedNetworks[networkName], expectedConfig)
      })
    })
  })

  describe('when there is no local config path', () => {
    useEnvironment('no-config')

    context('when there is no default config in home dir', () => {
      it('should not override any network config', function () {
        Object.entries(this.userNetworks).forEach(([networkName, userNetworkConfig]) => {
          const expectedConfig = Object.assign({}, DEFAULTS, userNetworkConfig)
          assert.deepStrictEqual(this.resolvedNetworks[networkName], expectedConfig)
        })
      })
    })

    context('when there is default config in home dir', () => {
      before('mock homedir', () => {
        mock({ homedir: path.join(__dirname, './helpers/fixtures/homedir') })
      })

      after(() => {
        mock.restore()
      })

      const homeConfig = require('./helpers/fixtures/homedir/.hardhat/networks.json')

      it('should prioritize project config over home config', function () {
        const expectedConfig = Object.assign({}, DEFAULTS, this.userNetworks.shouldNotBeOverridden)
        assert.deepStrictEqual(this.resolvedNetworks.shouldNotBeOverridden, expectedConfig)
      })

      it('should extend project config with home config', function () {
        const expectedConfig = {
          ...DEFAULTS,
          ...homeConfig.defaultConfig,
          ...homeConfig.networks.shouldBeExtended,
          ...this.userNetworks.shouldBeExtended,
        }

        assert.deepStrictEqual(this.resolvedNetworks.shouldBeExtended, expectedConfig)
      })

      it('should extend project config with home config prioritizing project config', function () {
        assert.deepStrictEqual(this.resolvedNetworks.shouldBePartiallyExtended, {
          ...DEFAULTS,
          ...homeConfig.defaultConfig,
          ...homeConfig.networks.shouldBePartiallyExtended,
          ...this.userNetworks.shouldBePartiallyExtended,
        })
      })

      it('should copy home configs', function () {
        assert.deepStrictEqual(this.resolvedNetworks.shouldBeCopiedFromHomeConfig, {
          ...homeConfig.defaultConfig,
          ...homeConfig.networks.shouldBeCopiedFromHomeConfig,
        })
      })

      it('should extend project config with home default config', function () {
        assert.deepStrictEqual(this.resolvedNetworks.shouldNotBeOverriddenByHomeDefaultConfig, {
          ...DEFAULTS,
          ...homeConfig.defaultConfig,
          ...this.userNetworks.shouldNotBeOverriddenByHomeDefaultConfig,
        })
      })
    })
  })

  describe('when there is a local config path', () => {
    describe('when the given local config path is not valid', () => {
      useEnvironment('invalid-config')

      it('should not override any network config', function () {
        Object.entries(this.userNetworks).forEach(([networkName, userNetworkConfig]) => {
          const expectedConfig = Object.assign({}, DEFAULTS, userNetworkConfig)
          assert.deepStrictEqual(this.resolvedNetworks[networkName], expectedConfig)
        })
      })
    })

    describe('when the given local config path is missing', () => {
      let previousCWD: string

      before(function () {
        const projectPath = __dirname + '/helpers/fixtures/project/missing-config'

        previousCWD = process.cwd()
        process.chdir(projectPath)
      })

      after(function () {
        resetHardhatContext()
        process.chdir(previousCWD)
      })

      it('should throw an error', function () {
        assert.throws(
          () => {
            this.hre = require('hardhat')
          },
          HardhatPluginError,
          'configuration file not found under "localNetworksConfig" path: ~/xyz/networks.ts;'
        )
      })
    })

    describe('when the given local config path is valid', () => {
      context('when the given local config file is empty', () => {
        useEnvironment('empty-config')

        it('should not override any network config', function () {
          Object.entries(this.userNetworks).forEach(([networkName, userNetworkConfig]) => {
            const expectedConfig = Object.assign({}, DEFAULTS, userNetworkConfig)
            assert.deepStrictEqual(this.resolvedNetworks[networkName], expectedConfig)
          })
        })
      })

      context('when networks are not defined in project config', () => {
        useEnvironment('no-networks')
        const localConfig = require('./helpers/fixtures/local/networks.json')

        it('should load networks from local config', function () {
          Object.entries(localConfig.networks).forEach(([networkName, userNetworkConfig]) => {
            const expectedConfig = Object.assign({}, localConfig.defaultConfig, userNetworkConfig)
            assert.deepStrictEqual(this.resolvedNetworks[networkName], expectedConfig)
          })
        })
      })

      const itLoadsTheLocalConfigProperly = (localConfig: any) => {
        it('should prioritize local config over project config', function () {
          const expectedConfig = Object.assign(
            {},
            DEFAULTS,
            this.userNetworks.shouldNotBeOverridden,
            localConfig.shouldNotBeOverridden
          )
          assert.deepStrictEqual(this.resolvedNetworks.shouldNotBeOverridden, expectedConfig)
        })

        it('should extend project config with local config', function() {
          assert.deepStrictEqual(this.resolvedNetworks.shouldBeExtended, {
            ...DEFAULTS,
            ...localConfig.defaultConfig,
            ...localConfig.networks.shouldBeExtended,
            ...this.userNetworks.shouldBeExtended
          })
        })

        it('should extend project config with local config prioritizing local config', function() {
          assert.deepStrictEqual(this.resolvedNetworks.shouldBePartiallyExtended, {
            ...DEFAULTS,
            ...localConfig.defaultConfig,
            ...this.userNetworks.shouldBePartiallyExtended,
            ...localConfig.networks.shouldBePartiallyExtended
          })
        })

        it('should copy local configs', function() {
          assert.deepStrictEqual(this.resolvedNetworks.shouldBeCopiedFromLocalConfig, {
            ...localConfig.defaultConfig,
            ...localConfig.networks.shouldBeCopiedFromLocalConfig
          })
        })

        it('should extend project config with local default config', function() {
          assert.deepStrictEqual(this.resolvedNetworks.shouldNotBeOverriddenByLocalDefaultConfig, {
            ...DEFAULTS,
            ...localConfig.defaultConfig,
            ...this.userNetworks.shouldNotBeOverriddenByLocalDefaultConfig,
          })
        })
      }

      describe('with a ts config file', () => {
        const localConfig = require('./helpers/fixtures/local/networks.ts')
        useEnvironment('valid-config-ts')
        itLoadsTheLocalConfigProperly(localConfig)
      })

      describe('with a json config file', () => {
        const localConfig = require('./helpers/fixtures/local/networks.json')
        useEnvironment('valid-config-json')
        itLoadsTheLocalConfigProperly(localConfig)
      })
    })
  })
})
