module.exports = function (urlLib) {
  console.log('********************** ', urlLib)
  if (urlLib) {
    return require(urlLib);
  }

  return require('url');
};
