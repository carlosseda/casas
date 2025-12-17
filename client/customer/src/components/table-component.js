import { store } from '../redux/store.js'
import { setPinElement } from '../redux/map-slice.js'
import isEqual from 'lodash-es/isEqual'

class Table extends HTMLElement {
  constructor () {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
    this.unsubscribe = null
    this.data = null
  }

  async connectedCallback () {
    this.unsubscribe = store.subscribe(() => {
      const currentState = store.getState()

      if (this.shadow.querySelector(`[data-id="${currentState.map.pinElement.id}"]`)) {
        this.selectItem(this.shadow.querySelector(`[data-id="${currentState.map.pinElement.id}"]`))
      }

      if (!isEqual(this.data, currentState.map.elements)) {
        this.data = currentState.map.elements
        this.render()
      }
    })
  }

  async render () {
    this.shadow.innerHTML =
    /* html */`<style>
      * {
        box-sizing: border-box;
        font-family: 'Lato', sans-serif;
      }

      .table {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: 100%;
        width: 100%;
      }

      .items {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        height: 85vh;
        min-width: 100%;
        max-width: 100%;
        overflow-y: auto;
        padding-right: 1rem;
        scrollbar-gutter: auto;
        transition: height 0.5s;
        width: 100%;
      }

      .items::-webkit-scrollbar {
        width: 0.7rem;
      }

      .items::-webkit-scrollbar-track {
        background: hsl(0, 0%, 95%); 
      }

      .items::-webkit-scrollbar-thumb {
        background: hsl(255deg 44% 50%);
      }

      .item {
        border: 2px solid hsl(0deg 0% 90%);
        border-radius: 0.2rem;
        cursor: pointer;
        width: 100%;
      }

      .item-header {
        align-items: center;
        background-color: hsl(0deg 0% 90%);
        display: flex;
        justify-content: space-between;
        padding: 0.5rem;
        width: 100%;
      }

      .no-results {
        color: hsl(280deg 56% 47%);
        font-weight: 600;
      }

      .item-header:hover, .item.active .item-header {
        background-color: hsl(280deg 56% 47%);
      }

      .item-header h2 {
        color: hsl(0deg 0% 0%);
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
      }

      .item-header:hover h2, .item.active .item-header h2 {
        color: hsl(0deg 0% 100%);
      }

      .item .item-header .close-button {
        display: none;
      }

      .item.active .item-header .close-button {
        align-items: center;
        display: flex;
      }

      .item-body {
        background-color: hsl(0deg 0% 100%);
        height: 0;
        min-height: 0;
        overflow: hidden;
        transition: height 0.5s;
      }

      .item.active .item-body {
        height: max-content;
        min-height: 100px;
        padding: 0.5rem;
      }

      .item-body p.no-location {
        color: hsl(0deg 100% 50%);
        font-weight: 600;
      }

      .item-header button {
        align-items: center;
        background-color: transparent;
        border: none;
        color: hsl(0deg 0% 100%);
        cursor: pointer;
        display: flex;
        font-size: 1.2rem;
      }

      .item-header button svg {
        fill: hsl(0deg 0% 100%);
        height: 1.5rem;
        width: 1.5rem;
      }
    </style>

    
    <section class="table">
      <div class="items"></div>
    </section>
    `

    await this.showData()
    await this.renderItems()
  }

  async showData () {
    const items = this.shadow.querySelector('.items')
    items.innerHTML = ''

    if (!this.data || this.data.length === 0) {
      const noResults = document.createElement('p')
      noResults.classList.add('no-results')
      noResults.textContent = 'No se encontraron resultados'
      items.appendChild(noResults)
      return
    }

    this.data.forEach((element) => {
      const item = document.createElement('div')
      item.dataset.id = element.id
      item.dataset.latitude = element.latitude
      item.dataset.longitude = element.longitude
      item.dataset.exactCoordinates = element.exactCoordinates
      item.classList.add('item')
      items.appendChild(item)

      const itemHeader = document.createElement('div')
      itemHeader.classList.add('item-header')
      item.appendChild(itemHeader)

      const title = document.createElement('h2')
      title.textContent = element.title
      itemHeader.appendChild(title)

      const closeButton = document.createElement('button')
      closeButton.classList.add('close-button')
      closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 10.586l-4.95-4.95-1.414 1.414 4.95 4.95-4.95 4.95 1.414 1.414 4.95-4.95 4.95 4.95 1.414-1.414-4.95-4.95 4.95-4.95-1.414-1.414-4.95 4.95-4.95-4.95-1.414 1.414 4.95 4.95z"/></svg>'
      itemHeader.appendChild(closeButton)

      const itemBody = document.createElement('div')
      itemBody.classList.add('item-body')
      item.appendChild(itemBody)

      const description = document.createElement('p')
      description.textContent = element.description
      itemBody.appendChild(description)

      const url = document.createElement('a')
      url.href = element.url
      url.textContent = element.url
      itemBody.appendChild(url)

      if (!element.latitude || !element.longitude || !element.exactCoordinates) {
        const noLocation = document.createElement('p')
        noLocation.classList.add('no-location')
        noLocation.textContent = 'No se ha encontrado la ubicación exacta de esta propiedad en el mapa'
        itemBody.appendChild(noLocation)
      }
    })
  }

  async renderItems () {
    const itemsContainer = this.shadow.querySelector('.table')

    itemsContainer.addEventListener('click', async event => {
      if (event.target.closest('.item')) {
        const item = event.target.closest('.item')
        this.selectItem(item)

        const element = this.data.find(element => element.id === item.dataset.id)

        const pinElement = {
          id: element.id,
          title: element.title,
          latitude: element.latitude ?? null,
          longitude: element.longitude ?? null,
          exactCoordinates: element.exactCoordinates ?? false,
        }

        store.dispatch(setPinElement(pinElement))
      }

      if (event.target.closest('.close-button')) {
        this.resetTable()
      }
    })
  }

  selectItem (item) {
    this.shadow.querySelector('.item.active')?.classList.remove('active')
    item.scrollIntoView({ behavior: 'smooth' })
    item.classList.add('active')
  }

  resetTable () {
    this.shadow.querySelector('.item.active')?.classList.remove('active')
    this.shadow.querySelector('.items').scrollTo(0, 0)

    const pinElement = {
      id: null,
      title: null,
      longitude: null,
      latitude: null,
      exactCoordinates: false
    }
    store.dispatch(setPinElement(pinElement))
  }
}

customElements.define('table-component', Table)
