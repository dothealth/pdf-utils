import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import { upload, get, download } from './services/network';
import { saveAs } from 'file-saver';
import PDFTool from './PDFTool';

export default class ProcessFile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      file: null,
      loading: false,
      active: false,
      message: null,
      error: null
    }
  }

  onFileChange = (files) => {
    const file = files[0];
    this.setState({
      file,
      active: false
    });
  }

  updateMessage(message) {
    this.setState({
      message
    });
    setTimeout(() => {
      this.setState({
        message: null
      });
    }, 2000)
  }

  makeHOCR = () => {
    this.setState({ loading: true })
    upload('/hocr_pdf', this.state.file).then((resp) => {
      if (resp.task) {
        const int = setInterval(() => {
          get(resp.task).then((data) => {
            if (data.status === 'SUCCESS') {
              window.clearInterval(int);
              this.setState({
                loading: false
              });
              return download(`/processed_files/${data.info.output}`).then((blob) => {
                const name = this.state.file.name.replace(/\.pdf/, '_hocr.pdf');
                saveAs(blob, name);
                this.updateMessage(`Downloaded file ${name}`);
              })
            }
          }).catch((error) => {
            this.setState({
              error,
              loading: false
            })
          })
        }, 500);
      }
    });
  }

  downloadGroup = (group) => {
    this.setState({ loading: true })
    upload('')
  }

  render() {
    return (
      <div>
        <div className='flex'>
          <Dropzone onDrop={this.onFileChange}>
            {({getRootProps, getInputProps}) => (
              <section className='pa3 br2 ba b--dashed bw2 mb3 b--light-blue bg-washed-blue'>
                <div {...getRootProps()}>
                  <input {...getInputProps()} />
                  <p>{this.state.file && this.state.file.name}</p>
                  {!this.state.file &&
                    <p>Drag and drop, or click to select files</p>
                  }
                  {this.state.loading &&
                    <p>working...</p>
                  }
                </div>
              </section>
            )}
          </Dropzone>
        </div>
        {this.state.error &&
          <p>{this.state.error}</p>
        }
        {this.state.message &&
          <p>{this.state.message}</p>
        }
        {this.state.file &&
          <button onClick={this.makeHOCR}>Make searchable PDF</button>
        }
        <PDFTool file={this.state.file} />
      </div>
    )
  }
}