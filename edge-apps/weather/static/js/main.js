/* global Alpine, icons, moment, clm, moment, OfflineGeocodeCity, screenly, tzlookup, Sentry */
/* eslint-disable-next-line no-unused-vars, no-useless-catch */

// AppCache
class AppCache {
  constructor ({ keyName }) {
    this.keyName = keyName

    if (localStorage.getItem(this.keyName) === null) {
      this.data = {}
      localStorage.setItem(this.keyName, JSON.stringify(this.data))
    } else {
      this.data = JSON.parse(localStorage.getItem(this.keyName))
      console.debug('Database setup complete')
    }
  }

  clear () {
    this.data = {}
    localStorage.removeItem(this.keyName)
  }

  set (data) {
    this.data = data
    localStorage.setItem(this.keyName, JSON.stringify(this.data))
  }

  get () {
    return this.data
  }
}

// getWeatherApiData from main.js
async function getWeatherApiData (context) {
  const stringifyQueryParams = (params) => {
    return Object.entries(params).map(
      ([key, value]) => `${key}=${value}`
    ).join('&')
  }

  const endpointUrl = 'https://api.openweathermap.org/data/2.5/forecast'

  const queryParams = stringifyQueryParams({
    lat: context.lat,
    lon: context.lng,
    units: 'metric', // TODO: Make this dependent on the current location.
    cnt: 10,
    appid: context.apiKey
  })

  let result
  const appCache = new AppCache({ keyName: 'weather' })

  try {
    const response = await fetch(`${endpointUrl}?${queryParams}`)
    const data = await response.json()

    if (data.cod !== '200') {
      throw new Error(data.message)
    }

    context.error = false

    appCache.clear()
    const { city: { name, country, timezone }, list } = data

    const timestamp = String(new Date())

    result = { name, country, timezone, list, timestamp }

    appCache.set(result)
  } catch (error) {
    console.error(error)

    result = appCache.get()

    const requiredKeys = ['name', 'country', 'timezone', 'list']
    const isComplete = requiredKeys.every((key) => {
      return Object.prototype.hasOwnProperty.call(result, key)
    })

    context.error = !isComplete
    context.errorMessage = error.message
  }

  return result
}

function formatTime (today) {
  const locale = navigator?.languages?.length
    ? navigator.languages[0]
    : navigator.language

  moment.locale(locale)
  console.log(moment(today).format('LT'))
  return moment(today).format('LT')
}

function refreshDateTime (context) {
  const now = moment().utcOffset(context.tzOffset)
  context.currentTime = formatTime(now)
  context.currentDate = now.format('dddd, MMM DD')
}

function findCurrentWeatherItem (list) {
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

function checkIfNight (context, dt) {
  const dateTime = moment.unix(dt).utcOffset(context.tzOffset)
  const hrs = dateTime.hour()

  return hrs <= 5 || hrs >= 20
}

function checkIfInRange (ranges, code) {
  return ranges.reduce(
    (acc, range) => acc || (code >= range[0] && code <= range[1])
  )
}

function getWeatherImagesById (context, id = 800, dt) {
  // List of codes - https://openweathermap.org/weather-conditions
  // To do - Refactor
  const isNight = checkIfNight(context, dt)
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
const getTemp = (context, temp) => {
  return Math.round(
    context.tempScale === 'C' ? temp : celsiusToFahrenheit(temp)
  )
}

async function refreshWeather (context) {
  try {
    const data = await getWeatherApiData(context)
    if (data.list !== undefined) {
      const { name, country, timezone: tzOffset, list } = data
      // We only want to set these values once.
      if (!context.firstFetchComplete) {
        context.city = `${name}, ${country}`
        context.tzOffset = parseInt(tzOffset / 60) // in minutes
        context.tempScale = countriesUsingFahrenheit.includes(country) ? 'F' : 'C'

        refreshDateTime(context)
        setInterval(
          () => {
            refreshDateTime(context)
          }, 1000 // 1 second
        )

        context.firstFetchComplete = true
        context.isLoading = false
      }

      const currentIndex = findCurrentWeatherItem(list)
      const { dt, weather, main: { temp } } = list[currentIndex]

      if (Array.isArray(weather) && weather.length > 0) {
        const { id, description } = weather[0]
        const { icon, bg } = getWeatherImagesById(context, id, dt)
        if ((id !== context.currentWeatherId) || (`bg-${bg}` !== context.bgClass)) {
          context.bgClass = `bg-${bg}`
        }

        context.currentWeatherIcon = icons[icon]
        context.currentWeatherStatus = description
        context.currentTemp = getTemp(context, temp)
        context.currentFormattedTempScale = `\u00B0${context.tempScale}`
        context.currentWeatherId = id
      }

      const windowSize = window.matchMedia('(orientation: portrait)').matches ? 4 : 7
      const currentWindow = list.slice(
        currentIndex + 1,
        currentIndex + 1 + windowSize
      )

      context.forecastedItems = currentWindow.map((item, index) => {
        const { dt, main: { temp }, weather } = item

        const { icon } = getWeatherImagesById(context, weather[0]?.id, dt)
        const dateTime = moment.unix(dt).utcOffset(context.tzOffset)

        return {
          id: index,
          temp: getTemp(context, temp),
          icon: icons[icon],
          time: formatTime(dateTime)
        }
      })
    }
  } catch (error) {
    context.error = true
    context.errorMessage = error.message
  }
}

function getWeatherData () {
  return {
    bgClass: '',
    city: '',
    currentDate: '',
    currentFormattedTempScale: '',
    currentTemp: null,
    currentTime: '',
    currentWeatherIcon: '',
    currentWeatherId: 0,
    currentWeatherStatus: '',
    error: false,
    errorMessage: '',
    firstFetchComplete: false,
    forecastedItems: [],
    init: async function () {
      if (screenly.settings.override_coordinates) {
        [this.lat, this.lng] = screenly.settings.override_coordinates.split(',')
      }

      if (!this.lat || !this.lng) {
        [this.lat, this.lng] = screenly.metadata?.coordinates
      }

      this.apiKey = screenly.settings.openweathermap_api_key

      await refreshWeather(this)
      setInterval(
        () => {
          refreshWeather(this)
        }, 1000 * 60 * 15 // 15 minutes
      )
    },
    isLoading: true,
    lat: 0,
    lng: 0,
    settings: {},
    tempScale: 'C',
    tzOffset: 0
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const { getNearestCity } = OfflineGeocodeCity
  const allTimezones = moment.tz.names()

  const sentryDsn = screenly.settings.sentry_dsn
  // Initiate Sentry.
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn
    })
  } else {
    console.warn('Sentry DSN is not defined. Sentry will not be initialized.')
  }

  async function timeAndDate () {
    const { metadata, settings } = screenly
    const latitude = metadata.coordinates[0]
    const longitude = metadata.coordinates[1]
    const defaultLocale = navigator?.languages?.length
      ? navigator.languages[0]
      : navigator.language

    const getLocale = async () => {
      const overrideLocale = settings?.override_locale

      if (overrideLocale) {
        if (moment.locales().includes(overrideLocale)) {
          return overrideLocale
        } else {
          console.warn(`Invalid locale: ${overrideLocale}. Using defaults.`)
        }
      }

      const data = await getNearestCity(latitude, longitude)
      const countryCode = data.countryIso2.toUpperCase()

      return clm.getLocaleByAlpha2(countryCode) || defaultLocale
    }

    const getTimezone = async () => {
      const overrideTimezone = settings?.override_timezone
      if (overrideTimezone) {
        if (allTimezones.includes(overrideTimezone)) {
          return overrideTimezone
        } else {
          console.warn(`Invalid timezone: ${overrideTimezone}. Using defaults.`)
        }
      }

      return tzlookup(latitude, longitude)
    }

    const initDateTime = async () => {
      const timezone = await getTimezone()
      const locale = await getLocale()
      const momentObject = moment().tz(timezone)

      if (locale) {
        momentObject.locale(locale) // Set the locale if available
      }

      const dayOfMonth = momentObject.format('D') // Get the day of the month

      // Check if the locale prefers a 24-hour format by checking 'LT'
      const is24HourFormat = moment.localeData(locale).longDateFormat('LT').includes('H')
      // Format time based on the locale's preference
      const formattedTime = is24HourFormat
        ? momentObject.format('HH:mm') // 24-hour format
        : momentObject.format('hh:mm') // 12-hour format

      // Handle AM/PM for 12-hour format
      const periodElement = document.querySelector('.time-ampm')
      if (is24HourFormat) {
        periodElement.innerText = '' // Clear AM/PM value in 24-hour format
        periodElement.style.display = 'none' // Optionally hide the element
      } else {
        const period = momentObject.format('A') // Get AM/PM for 12-hour format
        periodElement.innerText = period
        periodElement.style.display = 'inline' // Ensure it's visible
      }

      // Set time in card
      document.querySelector('.time-text-hour').innerText = formattedTime.split(':')[0]
      document.querySelector('.time-text-minutes').innerText = formattedTime.split(':')[1]
      // document.querySelector('.time-text-separator').innerText = ':'

      document.querySelector('.date-text').innerText = momentObject.format('ddd').toUpperCase()
      document.querySelector('.date-number').innerText = dayOfMonth // Set the inner text to the numeric day of the month
    }
    initDateTime() // Initialize the app
  }

  await timeAndDate()

  // constant colors
  const tertiaryColor = '#FFFFFF'
  const backgroundColor = '#C9CDD0'

  // Brand details fetching from settings
  const primaryColor = (!screenly.settings.screenly_color_accent || screenly.settings.screenly_color_accent.toLowerCase() === '#ffffff') ? '#972eff' : screenly.settings.screenly_color_accent
  const secondaryColor = (!screenly.settings.screenly_color_light || screenly.settings.screenly_color_light.toLowerCase() === '#ffffff') ? '#adafbe' : screenly.settings.screenly_color_light

  document.documentElement.style.setProperty('--theme-color-primary', primaryColor)
  document.documentElement.style.setProperty('--theme-color-secondary', secondaryColor)
  document.documentElement.style.setProperty('--theme-color-tertiary', tertiaryColor)
  document.documentElement.style.setProperty('--theme-color-background', backgroundColor)

  // Brand Image Setting

  const imgElement = document.getElementById('brand-logo')
  const corsUrl = screenly.cors_proxy_url + '/' + screenly.settings.screenly_logo_dark
  const fallbackUrl = screenly.settings.screenly_logo_dark
  const defaultLogo = 'static/img/Screenly.svg'

  // Function to fetch and process the image
  async function fetchImage (fileUrl) {
    try {
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch image from ${fileUrl}, status: ${response.status}`)
      }

      const blob = await response.blob()
      const buffer = await blob.arrayBuffer()
      const uintArray = new Uint8Array(buffer)

      // Get the first 4 bytes for magic number detection
      const hex = Array.from(uintArray.slice(0, 4))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('').toUpperCase()

      // Convert the first few bytes to ASCII for text-based formats like SVG
      const ascii = String.fromCharCode.apply(null, uintArray.slice(0, 100)) // Check first 100 chars for XML/SVG tags

      // Determine file type based on MIME type, magic number, or ASCII text
      if (ascii.startsWith('<?xml') || ascii.startsWith('<svg')) {
        // Convert to Base64 and display if SVG
        const svgReader = new FileReader()
        svgReader.readAsText(blob)
        svgReader.onloadend = function () {
          const base64 = btoa(unescape(encodeURIComponent(svgReader.result)))
          imgElement.src = 'data:image/svg+xml;base64,' + base64
        }
      } else if (hex === '89504E47' || hex.startsWith('FFD8FF')) {
        // Checking PNG or JPEG/JPG magic number
        imgElement.src = fileUrl
      } else {
        throw new Error('Unknown image type')
      }
    } catch (error) {
      console.error('Error fetching image:', error)
    }
  }

  // First, try to fetch the image using the CORS proxy URL
  try {
    await fetchImage(corsUrl)
  } catch (error) {
    // If CORS fails, try the fallback URL
    try {
      await fetchImage(fallbackUrl)
    } catch (fallbackError) {
      // If fallback fails, use the default logo
      imgElement.src = defaultLogo
    }
  }

  // Signal that the screen is ready for rendering
  screenly.signalReadyForRendering()
})

document.addEventListener('alpine:init', () => {
  Alpine.data('weather', getWeatherData)
})
