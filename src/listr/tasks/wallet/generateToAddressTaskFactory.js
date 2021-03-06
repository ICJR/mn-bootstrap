const { Listr } = require('listr2');

const { Observable } = require('rxjs');

/**
 *
 * @param {startCore} startCore
 * @param {createNewAddress} createNewAddress
 * @param {generateToAddress} generateToAddress
 * @param {generateBlocks} generateBlocks
 * @return {generateToAddressTask}
 */
function generateToAddressTaskFactory(
  startCore,
  createNewAddress,
  generateToAddress,
  generateBlocks,
) {
  /**
   * @typedef {generateToAddressTask}
   * @param {Config} config
   * @param {number} amount
   * @return {Listr}
   */
  function generateToAddressTask(config, amount) {
    return new Listr([
      {
        title: 'Start Core',
        enabled: (ctx) => {
          ctx.coreServicePassed = Boolean(ctx.coreService);

          return !ctx.coreServicePassed;
        },
        task: async (ctx) => {
          ctx.coreServicePassed = false;
          ctx.coreService = await startCore(config, { wallet: true });
        },
      },
      {
        title: 'Create a new address',
        skip: (ctx) => {
          if (ctx.address) {
            return `Use specified address ${ctx.address}`;
          }

          return false;
        },
        task: async (ctx, task) => {
          ({
            address: ctx.address,
            privateKey: ctx.privateKey,
          } = await createNewAddress(ctx.coreService));

          // eslint-disable-next-line no-param-reassign
          task.output = `Address: ${ctx.address}\nPrivate key: ${ctx.privateKey}`;
        },
        options: { persistentOutput: true },
      },
      {
        title: `Generate ≈${amount} dash to address`,
        task: (ctx, task) => {
          // eslint-disable-next-line no-param-reassign
          task.title += ` ${ctx.address}`;

          return new Observable(async (observer) => {
            await generateToAddress(
              ctx.coreService,
              amount,
              ctx.address,
              (balance) => {
                ctx.balance = balance;
                observer.next(`${balance} dash generated`);
              },
            );

            // eslint-disable-next-line no-param-reassign
            task.output = `Generated ${ctx.balance} dash`;

            // Set for further tasks
            ctx.fundingAddress = ctx.address;
            ctx.fundingPrivateKeyString = ctx.privateKey;

            observer.complete();

            return this;
          });
        },
        options: { persistentOutput: true },
      },
      {
        title: 'Mine 101 blocks to confirm coinbase',
        task: async (ctx) => (
          new Observable(async (observer) => {
            await generateBlocks(
              ctx.coreService,
              101,
              config.get('network'),
              (blocks) => {
                observer.next(`${blocks} ${blocks > 1 ? 'blocks' : 'block'} mined`);
              },
            );

            observer.complete();

            return this;
          })
        ),
      },
      {
        title: 'Stop Core',
        enabled: (ctx) => !ctx.coreServicePassed,
        task: async (ctx) => ctx.coreService.stop(),
      },
    ]);
  }

  return generateToAddressTask;
}

module.exports = generateToAddressTaskFactory;
