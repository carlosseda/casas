import { store } from '../redux/store.js'
import { setPinElement } from '../redux/map-slice.js'
import isEqual from 'lodash-es/isEqual'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  v: 'weekly',
  mapIds: [import.meta.env.VITE_GOOGLE_MAPS_ID]
})

class Map extends HTMLElement {
  constructor () {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
    this.markers = []
    this.unsubscribe = null
    this.data = []
    this.map = null
  }

  async connectedCallback () {
    this.unsubscribe = store.subscribe(() => {
      const currentState = store.getState()

      if (currentState.map.pinElement.latitude && currentState.map.pinElement.longitude) {
        this.showLocation(currentState.map.pinElement)
      } else {
        this.resetMap()
      }

      if (!isEqual(this.data, currentState.map.elements)) {
        this.data = currentState.map.elements
        this.render()
      }
    })

    await this.render()
  }

  disconnectedCallback () {
    if (this.unsubscribe) this.unsubscribe()
  }

  async render () {
    this.shadow.innerHTML =
    /* html */`<style>

      :host {
        display: block;
        height: 100%;
        width: 100%;
      }

      .map {
        height: 100vh;
        width: 100%;
      }

      .gm-style iframe + div { border:none!important; }
    </style>

    <div class="map"></div>
    `

    await this.loadMap()
  }

  async loadMap () {
    const { Map } = await importLibrary('maps')
    const { AdvancedMarkerElement, PinElement } = await importLibrary('marker')

    this.map = new Map(this.shadow.querySelector('.map'), {
      backgroundColor: 'hsl(217, 89%, 79%)',
      center: { lat: 39.6135612, lng: 2.8820133 },
      clickableIcons: false,
      disableDefaultUI: true,
      mapId: import.meta.env.VITE_GOOGLE_MAPS_ID,
      minZoom: 10,
      restriction: {
        latLngBounds: {
          east: 4.649715,
          north: 40.971935,
          south: 38.204442,
          west: 1.160065
        },
        strictBounds: true
      },
      zoom: 10
    })

    this.markers.forEach(marker => marker.setMap(null))
    this.markers = []

    this.data.forEach((element) => {
      if (!element.latitude || !element.longitude) return

      const pinView = new PinElement({
        background: 'hsl(280deg 56% 47%)',
        borderColor: 'hsl(0deg 0% 0%)',
        glyphColor: 'hsl(0deg 0% 0%)'
      })

      const marker = new AdvancedMarkerElement({
        map: this.map,
        position: { lat: element.latitude, lng: element.longitude },
        title: element.title,
        content: pinView.element
      })

      marker.addListener('click', () => {
        const pinElement = {
          id: element.id,
          title: element.title,
          longitude: element.longitude,
          latitude: element.latitude,
          exactCoordinates: element.exactCoordinates
        }

        store.dispatch(setPinElement(pinElement))
      })

      this.markers.push(marker)
    })
  }

  async showLocation (location) {
    if (!this.map) return

    const { PinElement } = await importLibrary('marker')
    const position = {
      lat: parseFloat(location.latitude),
      lng: parseFloat(location.longitude)
    }

    this.map.setCenter(position)
    this.map.setZoom(15)

    const pinViewActive = new PinElement({
      background: 'hsl(4deg 81% 42%)',
      borderColor: 'hsl(4deg 81% 42%)',
      glyphColor: 'hsl(0deg 0% 100%)'
    })

    this.markers.forEach(marker => {
      const { lat, lng } = marker.position
      if (lat === position.lat && lng === position.lng) {
        marker.setMap(this.map)
        marker.content = pinViewActive.element
      } else {
        marker.setMap(null)
      }
    })
  }

  async resetMap () {
    if (!this.map) return

    const { PinElement } = await importLibrary('marker')

    this.map.setCenter({ lat: 39.6135612, lng: 2.8820133 })
    this.map.setZoom(10)

    this.markers.forEach(marker => {
      const pinView = new PinElement({
        background: 'hsl(280deg 56% 47%)',
        borderColor: 'hsl(0deg 0% 0%)',
        glyphColor: 'hsl(0deg 0% 0%)'
      })

      marker.setMap(this.map)
      marker.content = pinView.element
    })
  }
}

customElements.define('map-component', Map)
