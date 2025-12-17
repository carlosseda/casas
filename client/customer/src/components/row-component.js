class Row extends HTMLElement {
  constructor () {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })

    this.defaultOptions = {
      columns: '8fr 2fr',
      gap: '1rem',
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

          .row{
            box-sizing: border-box;
            display: grid;
            gap: ${this.options.gap};
            grid-template-columns: ${this.options.columns};
            padding-top: ${this.options.paddingTop};
            padding-bottom: ${this.options.paddingBottom};
            padding-left: ${this.options.paddingLeft};
            padding-right: ${this.options.paddingRight};
            width: 100%;
          }
        </style>
        <div class="row">
          <slot></slot>
        </div>
      `
  }
}

customElements.define('row-component', Row)
