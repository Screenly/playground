/* global icons, moment */

// eslint-disable-next-line no-unused-vars
function initApp (data) {
  let clockTimer
  let weatherTimer
  let tz
  let currentWeatherId
  let tempScale = 'C'
  const locale = navigator?.languages?.length
    ? navigator.languages[0]
    : navigator.language
  const [lat, lng] = screenly.metadata.coordinates
  const weatherDataUpdateInterval = 60 * 60 * 1000 // 60 minutes in milliseconds
  const dateTimeUpdateInterval = 30 * 1000 // 30 seconds in milliseconds

  let db;

  const openRequest = window.indexedDB.open('weatherDb', 1)

  openRequest.addEventListener('error', () => {
    console.error('Database failed to open')
  })

  openRequest.addEventListener('success', () => {
    console.log('Database opened successfully')
    db = openRequest.result
  })

  openRequest.addEventListener('upgradeneeded', (e) => {
    db = e.target.result

    const objectStore = db.createObjectStore('weatherStore', {
      keyPath: 'id',
      autoIncrement: true
    })

    objectStore.createIndex('name', 'name', { unique: false })
    objectStore.createIndex('country', 'country', { unique: false })
    objectStore.createIndex('timezone', 'timezone', { unique: false })
    objectStore.createIndex('list', 'list', { unique: false })

    console.log('Database setup complete')
  })

  const getDataFromIndexedDB = (db, callback) => {
    const objectStore = db.transaction('weatherStore').objectStore('weatherStore')
    objectStore.openCursor().addEventListener('success', (e) => {
      const cursor = e.target.result
      if (cursor) {
        callback(cursor.value)
      }
    })
  }

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
  const timeZonesUsingFahrenheit = countriesUsingFahrenheit.map(
    country => {
      let timezones = moment.tz.zonesForCountry(country)

      if (country === "BS") {
        timezones = timezones.filter(tz => tz !== 'America/Toronto')
      }

      return timezones
    }
  ).flat()

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

    clockTimer = setTimeout(() => initDateTime(), dateTimeUpdateInterval)
  }

  const updateLocation = (name) => {
    updateContent('city', name)
  }

  const updateCurrentWeather = (icon, desc, temp) => {
    updateAttribute('current-weather-icon', 'src', icons[icon])
    updateContent('current-weather-status', desc)
    updateContent('current-temp', Math.round(temp))
    updateContent('current-temp-scale', `\u00B0${tempScale}`)
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

  const updateWeather = () => {
    clearTimeout(weatherTimer)
    getDataFromIndexedDB(db, (data) => {
      const { list } = data
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
        node.querySelector('.item-temp').innerText = Math.round(temp)
        node.querySelector('.item-icon').setAttribute('src', icons[icon])
        node.querySelector('.item-time').innerText = index === 0 ? 'Current' : formatTime(dateTime)

        frag.appendChild(node)
      })

      weatherListContainer.innerHTML = ''
      weatherListContainer.appendChild(frag)
    })
    weatherTimer = setTimeout(() => updateWeather(), weatherDataUpdateInterval)
  }

  const updateData = () => {
    getDataFromIndexedDB(db, (data) => {
      const { name, country, timezone } = data
      tempScale = timeZonesUsingFahrenheit.includes(tzlookup(lat, lng)) ? 'F' : 'C'
      updateLocation(name)
      tz = setTimeZone(timezone)
      initDateTime()
    })

    updateWeather()
  }

  const cacheWeatherData = (data) => {
    const { city: { name, country, timezone }, list } = data

    const transaction = db.transaction(['weatherStore'], 'readwrite')
    const objectStore = transaction.objectStore('weatherStore')
    objectStore.clear()
    const addRequest = objectStore.add({ name, country, timezone, list })

    addRequest.addEventListener('success', () => {
      console.log('Weather data added to the store')
    })

    transaction.addEventListener('complete', () => {
      console.log('Transaction completed: database modification finished')
    })

    transaction.addEventListener('error', () => {
      console.error('Transaction not opened due to error')
    })
  }

  const stringifyQueryParams = (params) => {
    return Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')
  }

  const fetchWeather = async () => {
    try {
      const timezone = tzlookup(lat, lng)
      const units = timeZonesUsingFahrenheit.includes(timezone) ? 'imperial' : 'metric'
      const endpointUrl = `https://api.openweathermap.org/data/2.5/forecast`
      const apiKey = screenly.settings.openweathermap_api_key
      const queryParams = stringifyQueryParams({
        lat: lat,
        lon: lng,
        units,
        cnt: 10,
        appid: apiKey,
      })

      setInterval(await (async () => {
        const lambda = async () => {
          const response = await fetch(`${endpointUrl}?${queryParams}`)
          const data = await response.json()
          cacheWeatherData(data)
        }

        await lambda()
        return lambda
      })(), weatherDataUpdateInterval)

      updateData()
    } catch (e) {
      console.log(e)
    }
  }

  const init = () => {
    fetchWeather()
  }

  init()
}

window.onload = initApp;
