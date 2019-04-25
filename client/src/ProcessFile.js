import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import { upload, get, download } from './services/network';
import { saveAs } from 'file-saver';
import { pageRange } from './services/params';
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

  makeHOCR = (file) => {
    this.setState({ loading: true })
    upload('/hocr_pdf', file || this.state.file).then((resp) => {
      if (resp.task) {
        const int = setInterval(() => {
          get(resp.task).then((data) => {
            if (data.status === 'SUCCESS') {
              window.clearInterval(int);
              this.setState({
                loading: false
              });
              return download(`/processed_files/${data.info.output}`).then((blob) => {
                let originalFile = file || this.state.file
                const name = originalFile.name.replace(/\.pdf/, '_hocr.pdf');
                saveAs(blob, name);
                this.updateMessage(`Downloaded file ${name}`);
              })
            }
          }).catch((error) => {
            console.log(error)
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
    upload(`/split_pdf?pages=${pageRange(group)}`, this.state.file, {}, true).then((blob) => {
      const name = this.state.file.name.replace(/\.pdf/, `_${pageRange(group)}.pdf`);
      saveAs(blob, name);
      this.updateMessage(`Downloaded file ${name}`);
    });
  }

  downloadGroupAsHOCR = (group) => {
    this.setState({ loading: true })
    upload(`/split_pdf?pages=${pageRange(group)}`, this.state.file, {}, true).then((blob) => {
      blob.name = this.state.file.name.replace(/\.pdf/, `_${pageRange(group)}.pdf`);
      this.makeHOCR(blob);
    });
  }

  render() {
    return (
      <div>
        <div className='flex items-center mb3'>
          <Dropzone onDrop={this.onFileChange}>
            {({getRootProps, getInputProps}) => (
              <section className='pa3 br2 ba b--dashed bw2 b--light-blue bg-washed-blue'>
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
          {this.state.loading &&
            <div className='loader ml3 is-primary is-large'></div>
          }
        </div>
        {/* {this.state.error &&
          <p>{this.state.error}</p>
        } */}
        {this.state.message &&
          <p>{this.state.message}</p>
        }
        {this.state.file &&
          <button className='button is-primary mb3' onClick={this.makeHOCR}>Make searchable PDF</button>
        }
        <PDFTool file={this.state.file} downloadGroup={this.downloadGroup}
          actions={(group) => (
            <div className='field has-addons'>
              <div className='control'>
                <button className={`button`} onClick={() => this.downloadGroup(group)}>Download</button>
              </div>
              <div className='control'>
                <button className={`button`} onClick={() => this.downloadGroupAsHOCR(group)}>Download searchable</button>
              </div>
            </div>
          )}
        />
      </div>
    )
  }
}