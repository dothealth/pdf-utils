function asyncLoad (scriptURL, callback) {
  if (!scriptURL) {
    return;
  }
  let firstScriptTag = document.getElementsByTagName('script')[0];
  let js = document.createElement('script');
  js.type = 'text/javascript';
  js.src = scriptURL;
  js.async = true;

  if (callback && typeof(callback) === typeof(Function)) {
    if (js.addEventListener) {
      js.addEventListener('load', callback, false);
    }
  }
  firstScriptTag.parentNode.insertBefore(js, firstScriptTag);
}

export default asyncLoad;