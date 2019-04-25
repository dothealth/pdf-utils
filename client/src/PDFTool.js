import React, { Component } from 'react';
import asyncLoad from './services/async-load';
import { pageRange } from './services/params';
import PDFPage from './PDFPage';

export default class PDFTool extends Component {
  pdfjsLib = null;

  state = {
    blob: null,
    file: '',
    loading: false,
    pageCount: 0,
    pages: [],
    selectedPages: [],
    groups: [],
    deleted: [],
    magnified: null,
    error: null,
    groupsDropdown: false,
    showSelected: true
  }

  componentWillMount() {
    asyncLoad('/pdf.min.js', () => {
      this.pdfjsLib = window.pdfjsLib;
    })
  }

  componentDidMount() {
    this.setState({file: 'multipage.pdf'});
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.file !== prevProps.file) {
      this.onFileChange();
    } else if ((this.state.file && !prevState.file) || (this.state.file !== prevState.file)) {
      if (this.pdfjsLib) {
        this.getDocument(this.state.file)
      } else {
        asyncLoad('/pdf.min.js', () => {
          this.pdfjsLib = window.pdfjsLib;
          this.getDocument(this.state.file)
        });
      }
    }
  }

  getDocument(file) {
    this.setState({
      loading: true
    });
    this.pdfjsLib.getDocument(file).then((pdf) => {
      this.setState({
        pageCount: pdf.numPages
      });
      Promise.all(Array.from({ length: pdf.numPages }).map((v, i) => {
        return pdf.getPage(i + 1)
      })).then((pages) => {
        this.setState({
          selectedPages: [],
          groups: [],
          deleted: [],
          pages,
          loading: false
        });
      });
    });
  }

  onFileChange = () => {
    let { file }  = this.props;
    if (!file) {
      return;
    }
    if (file.type !== 'application/pdf'){
      this.setState({
        error: `${file.name} is not a pdf file`
      })
      return
    } else {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        var typedarray = new Uint8Array(fileReader.result);
        var blob = new Blob([typedarray], {'type': 'application/pdf'});
        var url = URL.createObjectURL(blob);
        this.setState({
          blob: blob,
          file: url,
        })
      }
      fileReader.readAsArrayBuffer(file);
    }
  }


  onPageClick = (page) => {
    const { pageIndex } = page;
    const indexInSelected = this.state.selectedPages.indexOf(pageIndex);
    if (indexInSelected >= 0) {
      const selectedPages = this.state.selectedPages.slice();
      selectedPages.splice(indexInSelected, 1);
      this.setState({
        selectedPages
      });
    } else {
      this.setState({
        selectedPages: this.state.selectedPages.concat([pageIndex])
      });
    }
  }

  createGroup = () => {
    const pages = this.state.selectedPages.slice();
    const group = {
      pages,
      annotations: [],
      rotations: pages.map(() => 0)
    }
    this.setState({
      groups: this.state.groups.concat([group]),
      selectedPages: []
    });
  }

  addToGroup = (groupIndex) => {
    const groups = this.state.groups.slice();
    const group = groups[groupIndex];
    groups[groupIndex] = {
      ...group,
      pages: group.pages.concat(this.state.selectedPages),
      rotations: group.rotations.concat([0])
    }
    this.setState({
      groups,
      selectedPages: [],
      groupsDropdown: false
    });
  }

  removePageFromGroup = (groupIndex, pageIndex) => {
    const groups = this.state.groups.slice();
    const group = this.state.groups[groupIndex];
    const pages = group.pages.slice();
    const rotations = group.rotations.slice();
    pages.splice(pageIndex, 1);
    rotations.splice(pageIndex, 1);
    if (pages.length === 0) {
      groups.splice(groupIndex, 1)
    } else {
      groups[groupIndex] = {
        ...group,
        pages,
        rotations
      }
    }
    this.setState({
      groups
    });
  }

  rotatePageInGroup = (groupIndex, pageIndex) => {
    const groups = this.state.groups.slice();
    const group = { ...this.state.groups[groupIndex] };
    const rotation = group.rotations[pageIndex]
    group.rotations[pageIndex] = rotation < 270 ? rotation + 90 : 0;
    groups[groupIndex] = group;
    this.setState({
      groups
    });
  }

  deletePage = (page) => {
    const { pageIndex } = page;
    const groups = this.state.groups.map((group) => {
      const pages = group.pages.slice();
      if (pages.includes(pageIndex)) {
        pages.splice(pages.indexOf(pageIndex), 1)
      }
      return {
        ...group,
        pages
      }
    }).filter((group) => {
      return group.pages.length > 0
    })
    this.setState({
      groups,
      deleted: this.state.deleted.concat(pageIndex)
    })
  }

  selectRemaining = () => {
    const grouped = this.state.groups.reduce((acc, group) => ( acc.concat(group.pages) ), [])
    const remaining = this.state.pages.reduce((acc, page, i) => {
      if (!grouped.includes(i)) {
        return acc.concat(i)
      }
      return acc;
    }, []);
    this.setState({
      selectedPages: [...this.state.selectedPages, ...remaining]
    });
  }

  updateGroup = (groupIndex, updated) => {
    const groups = this.state.groups.slice();
    groups[groupIndex] = {
      ...groups[groupIndex],
      ...updated
    }
    if (groups[groupIndex].pages.length === 0) {
      groups.splice(groupIndex, 1)
    }
    this.setState({
      groups
    });
  }

  render() {
    if (!this.state.file) {
      return null;
    }
    const grouped = this.state.groups.reduce((acc, group) => ( acc.concat(group.pages) ), [])
    return (
      <div>
        {this.state.magnifiedPage &&
          <div className='modal is-active'>
            <div className='modal-background'></div>
            <div className='modal-content'>
              <PDFPage page={this.state.magnifiedPage} size={800} />
            </div>
            <button className='modal-close is-large' onClick={() => this.setState({ magnifiedPage: null })}></button>
          </div>
        }
        {this.state.groups.map((group, i) => (
          <div key={i}>
            <p>{pageRange(group)}</p>
            {group.pages.map((page, j) => (
              <PDFPage
                key={this.state.pages[page].pageIndex}
                index={this.state.pages[page].pageIndex}
                page={this.state.pages[page]}
                rotation={group.rotations[j]}
              >
                <div>
                  <button onClick={(e) => {
                    this.rotatePageInGroup(i, j)
                    e.stopPropagation();
                  }}>rotate</button>
                  <button onClick={(e) => {
                    this.removePageFromGroup(i, j)
                    e.stopPropagation();
                  }}>remove</button>
                  <button onClick={(e) => {
                    this.setState({ magnifiedPage: this.state.pages[page] })
                    e.stopPropagation();
                  }}>magnify</button>
                </div>
              </PDFPage>
            ))}
          </div>
        ))}
        <div className='toolbar'>
          <button disabled={this.state.selectedPages.length === 0} onClick={this.createGroup}>Create group</button>
          <div>
            <button
              disabled={this.state.selectedPages.length === 0 || this.state.groups.length === 0}
              onClick={() => { this.setState({ groupsDropdown: !this.state.groupsDropdown }) }}>
                Add to group
            </button>
            {this.state.groupsDropdown &&
              <div>
                {this.state.groups.map((group, i) => (
                  <button onClick={() => this.addToGroup(i)}>{pageRange(group)}</button>
                ))}
              </div>
            }
          </div>
          <button disabled={this.state.groups.length === 0} onClick={() => { this.setState({ showSelected: !this.state.showSelected }) }}>Hide selected</button>
          <button disabled={this.state.groups.length === 0} onClick={this.selectRemaining}>Select remaining</button>
        </div>
         {this.state.pages.map((page, i) => ((this.state.showSelected || !grouped.includes(page.pageIndex)) &&
            <div className='dib' key={i}>
              <PDFPage
                key={i}
                index={i}
                page={page}
                onClick={() => this.onPageClick(page)}
                grouped={grouped.includes(page.pageIndex)}
                selected={this.state.selectedPages.includes(page.pageIndex)}
                deleted={this.state.deleted.includes(page.pageIndex)}
              >
                <div>
                  <button onClick={(e) => {
                    this.deletePage(page)
                    e.stopPropagation();
                   }}>delete</button>
                  <button onClick={(e) => {
                    this.setState({ magnifiedPage: page })
                    e.stopPropagation();
                  }}>magnify</button>
                </div>
              </PDFPage>
            </div>
          ))}
      </div>
    )
  }
}