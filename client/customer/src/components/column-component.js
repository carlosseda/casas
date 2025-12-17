class Column extends HTMLElement {
  constructor () {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })

    this.defaultOptions = {
      gap: '1rem',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      paddingTop: '0',
      paddingBottom: '0',
      paddingLeft: '0',
      paddingRight: '0'
    }

    this.options = {}
  }

  static get observedAttributes () {
    return ['options']
  }

  attributeChangedCallback (name, oldValue, newValue) {
    this.options = JSON.parse(newValue)
    this.render()
  }

  connectedCallback () {
    this.render()
  }

  render () {
    this.options = Object.assign({}, this.defaultOptions, this.options)

    this.shadow.innerHTML =
      /* html */`
      <style>
        :host{
          display: block;
          width: 100%;
        }

        .column{
          display: flex;
          flex-direction: ${this.options.flexDirection};
          gap: ${this.options.gap};
          justify-content: ${this.options.justifyContent};
          padding-top: ${this.options.paddingTop};
          padding-bottom: ${this.options.paddingBottom};
          padding-left: ${this.options.paddingLeft};
          padding-right: ${this.options.paddingRight};
        }
      </style>
      <div class="column">
        <slot></slot>
      </div>
    `
  }
}

customElements.define('column-component', Column)
