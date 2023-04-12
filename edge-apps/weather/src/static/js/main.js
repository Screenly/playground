/* global icons, moment */

// eslint-disable-next-line no-unused-vars
function initApp (data) {
  let clockTimer
  let weatherTimer
  let refreshTimer
  let tz
  let currentWeatherId
  let tempScale = 'C'
  const locale = navigator?.languages?.length
    ? navigator.languages[0]
    : navigator.language
  const { lat, lng } = data

  /**
   * Countries using F scale
   * United States
   * Bahamas.
   * Cayman Islands.
   * Liberia.
   * Palau.
   * The Federated States of Micronesia.
   * Marshall Islands.
   */

  const countriesUsingFahrenheit = ['US', 'BS', 'KY', 'LR', 'PW', 'FM', 'MH']
  const celsiusToFahrenheit = (temp) => ((1.8 * temp) + 32)

  const getTemp = (temp) => Math.round(tempScale === 'C' ? temp : celsiusToFahrenheit(temp))

  const checkIfNight = (dt) => {
    const dateTime = moment.unix(dt).utcOffset(tz)
    const hrs = dateTime.hour()

    return hrs <= 5 || hrs >= 20
  }

  const updateContent = (id, text) => {
    document.querySelector(`#${id}`).innerText = text
  }

  const updateAttribute = (id, attr, val) => document.querySelector(`#${id}`).setAttribute(attr, val)

  const loadBackground = (img) => {
    document.body.removeAttribute('class')
    document.body.classList.add(`bg-${img}`)
  }

  const checkIfInRange = (ranges, code) => ranges.reduce((acc, range) => acc || (code >= range[0] && code <= range[1]))

  const getWeatherImagesById = (id = 800, dt) => {
    // List of codes - https://openweathermap.org/weather-conditions
    // To do - Refactor
    const isNight = checkIfNight(dt)
    const hasNightBg = checkIfInRange([[200, 399], [500, 699], [800, 804]], id)
    let icon
    let bg

    if (id >= 200 && id <= 299) {
      icon = 'thunderstorm'
      bg = 'thunderstorm'
    }

    if (id >= 300 && id <= 399) {
      icon = 'drizzle'
      bg = 'drizzle'
    }

    if (id >= 500 && id <= 599) {
      icon = 'rain'
      bg = 'rain'
    }

    if (id >= 600 && id <= 699) {
      icon = 'snow'
      bg = 'snow'
    }

    if (id >= 700 && id <= 799) {
      // To do - Handle all 7xx cases
      icon = 'haze'

      if (id === 701 || id === 721 || id === 741) {
        bg = 'haze'
      } else if (id === 711) {
        bg = 'smoke'
      } else if (id === 731 || id === 751 || id === 761) {
        bg = 'sand'
      } else if (id === 762) {
        bg = 'volcanic-ash'
      } else if (id === 771) {
        // To do - change image squall
        bg = 'volcanic-ash'
      } else if (id === 781) {
        bg = 'tornado'
      }
    }

    if (id === 800) {
      icon = 'clear'
      bg = 'clear'
    }

    if (id === 801) {
      icon = 'partially-cloudy'
      bg = 'cloudy'
    }

    if (id >= 802 && id <= 804) {
      icon = 'mostly-cloudy'
      bg = 'cloudy'
    }

    return {
      icon: isNight ? `${icon}-night` : icon,
      bg: isNight && hasNightBg ? `${bg}-night` : bg
    }
  }

  const setTimeZone = tzOffset => parseInt(tzOffset / 60)

  const formatTime = (today) => {
    moment.locale(locale)
    return moment(today).format('LT')
  }

  const initDateTime = () => {
    clearTimeout(clockTimer)
    const now = moment().utcOffset(tz)

    updateContent('time', formatTime(now))
    updateContent('date', now.format('dddd, MMM DD'))

    clockTimer = setTimeout(() => initDateTime(), 30000)
  }

  const updateLocation = (name) => {
    updateContent('city', name)
  }

  const updateCurrentWeather = (icon, desc, temp) => {
    updateAttribute('current-weather-icon', 'src', icons[icon])
    updateContent('current-weather-status', desc)
    updateContent('current-temp', getTemp(temp))
    updateContent('current-temp-scale', `°${tempScale}`)
  }

  const findCurrentWeatherItem = (list) => {
    const currentUTC = Math.round(new Date().getTime() / 1000)
    let itemIndex = 0

    while (itemIndex < list.length - 1 && list[itemIndex].dt < currentUTC) {
      itemIndex++
    }

    if (itemIndex > 0) {
      const timeDiffFromPrev = currentUTC - list[itemIndex - 1].dt
      const timeDiffFromCurrent = list[itemIndex].dt - currentUTC

      if (timeDiffFromPrev < timeDiffFromCurrent) {
        itemIndex = itemIndex - 1
      }
    }

    return itemIndex
  }

  const updateWeather = (list) => {
    clearTimeout(weatherTimer)
    const currentIndex = findCurrentWeatherItem(list)

    const { dt, weather, main: { temp } } = list[currentIndex]

    if (Array.isArray(weather) && weather.length > 0) {
      const { id, description } = weather[0]
      const { icon, bg } = getWeatherImagesById(id, dt)
      if (id !== currentWeatherId) {
        loadBackground(bg)
      }

      updateCurrentWeather(icon, description, temp)
      currentWeatherId = id
    }

    const weatherListContainer = document.querySelector('#weather-item-list')
    const frag = document.createDocumentFragment()
    const windowSize = 5
    const currentWindow = list.slice(currentIndex, currentIndex <= windowSize - 1 ? currentIndex + windowSize : list.length - 1)
    currentWindow.forEach((item, index) => {
      const { dt, main: { temp }, weather } = item

      const { icon } = getWeatherImagesById(weather[0]?.id, dt)
      const dateTime = moment.unix(dt).utcOffset(tz)

      const dummyNode = document.querySelector('.dummy-node')
      const node = dummyNode.cloneNode(true)
      node.classList.remove('dummy-node')
      node.querySelector('.item-temp').innerText = getTemp(temp)
      node.querySelector('.item-icon').setAttribute('src', icons[icon])
      node.querySelector('.item-time').innerText = index === 0 ? 'Current' : formatTime(dateTime)

      frag.appendChild(node)
    })

    weatherListContainer.innerHTML = ''
    weatherListContainer.appendChild(frag)
    // Refresh weather from local list every 15 mins
    weatherTimer = setTimeout(() => updateWeather(list), 10 * 60 * 1000)
  }

  const updateData = (data) => {
    const { city: { name, country, timezone }, list } = data
    tempScale = countriesUsingFahrenheit.includes(country) ? 'F' : 'C'

    updateLocation(name)
    setTimeZone(timezone)
    initDateTime(timezone)
    updateWeather(list)
  }

  /**
   * Fetch weather
   */

  const fetchWeather = async () => {
    clearTimeout(refreshTimer)
    try {
      const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&cnt=10&appid=001085696589b9680f971c7d40e8e1f3`)
      const data = await response.json()
      updateData(data)
    } catch (e) {
      console.log(e)
    }
  }

  const init = () => {
    fetchWeather()
    // Refresh weather every 2 hours
    refreshTimer = setTimeout(fetchWeather, 120 * 60 * 1000)
  }

  init()
}