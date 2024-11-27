(function () {
  const username = '<USERNAME>'
  const password = '<PASSWORD>'

  const authLocation = '/portal/sharing/rest/oauth2/authorize'

  function setValue (selector, value) {
    const element = document.querySelector(selector)
    element.value = value
    element.dispatchEvent(new Event('change'))
  }

  function submitForm () {
    document.querySelector('button[id="signIn"]').click()
  }

  function login () {
    try {
      setValue('input[name="username"]', username)
      setValue('input[name="password"]', password)
      submitForm()
    } catch (error) {
      console.warn(error)
      setTimeout(login, 3000)
    }
  }

  if (window.location.pathname === authLocation) {
    login()
  }
})()
