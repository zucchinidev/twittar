export default function loadScripts (urls, yeyCallback, neyCallback) {
  let count = urls.length
  let error = false

  if (urls.length === 0) {
    return yeyCallback()
  }

  urls.forEach(function (url) {
    const script = document.createElement('script')
    script.onload = function () {
      if (error) {
        return
      }

      if (!--count) {
        yeyCallback()
      }
    }

    script.onerror = function () {
      if (error) {
        return
      }
      neyCallback()
      error = true
    }
    script.src = url
    document.head.insertBefore(script, document.head.firstChild)
  })
};