import React, { Component } from 'react';

export default class PDFPage extends Component {
  canvas = null;
  state = {}

  componentDidMount() {
    this.renderPage(this.props.page, this.props.rotation);
  }

  componentWillReceiveProps(nextProps) {
    if ((!this.props.page && nextProps.page) || (nextProps.page !== this.props.page) || (this.props.rotation !== nextProps.rotation)) {
      if (nextProps.page) {
        this.renderPage(nextProps.page, nextProps.rotation)
      }
    }
  }

  renderPage(page, rotation) {
    const height = this.props.size || 300;
    const viewport = page.getViewport(1);
    const scale = height / viewport.height;
    const scaledViewport = page.getViewport(scale, rotation);

    let context = this.canvas.getContext('2d');
    this.canvas.height = scaledViewport.height;
    this.canvas.width = scaledViewport.width;

    let renderContext = {
      canvasContext: context,
      viewport: scaledViewport
    };
    page.render(renderContext)
  }

  render() {
    if (this.props.deleted) {
      return null;
    }
    return (
      <div
        onClick={this.props.onClick}
        className='dib relative pdf-page mr1 mb1 ba b--light-silver'
      >
        {this.props.selected && <div className='pdf-highlight bg-light-yellow'></div> }
        {this.props.grouped && <div className='pdf-disabled bg-light-green'></div> }
        {!isNaN(this.props.index) &&
          <div className='pdf-meta'><span className='ma2'>{this.props.index + 1}</span></div>
        }
        {this.props.children &&
          <div className='pdf-actions'>
            <div className='pdf-action-buttons'>
              {this.props.children}
            </div>
          </div>
        }
        <canvas ref={(ref) => this.canvas = ref} />
      </div>
    )
  }
}
