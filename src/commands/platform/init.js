const { Listr } = require('listr2');

const { flags: flagTypes } = require('@oclif/command');

const ConfigBaseCommand = require('../../oclif/command/ConfigBaseCommand');
const MuteOneLineError = require('../../oclif/errors/MuteOneLineError');

class InitCommand extends ConfigBaseCommand {
  /**
   *
   * @param {Object} args
   * @param {Object} flags
   * @param {DockerCompose} dockerCompose
   * @param {initTask} initTask
   * @param {Config} config
   * @return {Promise<void>}
   */
  async runWithDependencies(
    {
      'dapi-address': dapiAddress,
      'funding-private-key': fundingPrivateKeyString,
    },
    {
      'drive-image-build-path': driveImageBuildPath,
      'dapi-image-build-path': dapiImageBuildPath,
      verbose: isVerbose,
    },
    dockerCompose,
    initTask,
    config,
  ) {
    const tasks = new Listr([
      {
        title: 'Initialize Platform',
        task: () => initTask(config),
      },
    ],
    {
      renderer: isVerbose ? 'verbose' : 'default',
      rendererOptions: {
        clearOutput: false,
        collapse: false,
        showSubtasks: true,
      },
    });

    try {
      await tasks.run({
        fundingPrivateKeyString,
        dapiAddress,
        driveImageBuildPath,
        dapiImageBuildPath,
      });
    } catch (e) {
      throw new MuteOneLineError(e);
    }
  }
}

InitCommand.description = `Initialize platform
...
Register DPNS Contract and "dash" top-level domain
`;

InitCommand.args = [{
  name: 'funding-private-key',
  required: true,
  description: 'private key with dash for funding account',
},
{
  name: 'dapi-address',
  required: false,
  description: 'DAPI address to send init transitions to',
}];

InitCommand.flags = {
  ...ConfigBaseCommand.flags,
  'drive-image-build-path': flagTypes.string({
    description: 'drive\'s docker image build path',
    default: null,
  }),
  'dapi-image-build-path': flagTypes.string({
    description: 'dapi\'s docker image build path',
    default: null,
  }),
};

module.exports = InitCommand;
