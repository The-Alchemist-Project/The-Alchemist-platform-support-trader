const path = require('path');

if (process.argv.length < 3) {
  console.error(`Missing argument, you need to provide the filename of the adapter to test.
    Eg: node test.js src/providers/{project}/myadapter.js`);
  process.exit(1);
}
const passedFile = path.resolve(process.cwd(), process.argv[2]);
const columns = ['name', 'address', 'tvl', 'apy', 'depositCoins'];

(async () => {
  const m = require(passedFile);
  const apy = await m.run();
  if (apy) {
    console.table(apy, columns);
  }

  process.exit(0);
})();
