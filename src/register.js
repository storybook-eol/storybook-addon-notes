import React from 'react';
import addons from '@kadira/storybook-addons';
import uuid from 'uuid';
import debounce from 'lodash.debounce';

// addons, panels and events get unique names using a prefix
export const ADDON_ID = 'kadirahq/storybook-addon-notes';
export const PANEL_ID = `${ADDON_ID}/notes-panel`;
export const COLLECTION_ID = `${ADDON_ID}/notes-collection`;

const styles = {
  wrapper: {
    flex: 1,
    display: 'flex',
    position: 'relative',
  },
  textarea: {
    flex: 1,
    outline: 'none',
    border: 'none',
    resize: 'none',
    padding: 10,
    fontFamily: 'Arial',
    fontSize: 14,
    color: '#444',
    lineHeight: 1.5,
  },
  errorText: {
    color: '#C62828',
  },
  modifiedMessage: {
    position: 'absolute',
    top: 5,
    right: 5,
    color: '#000',
    opacity: 0,
    fontSize: 12,
    transition: 'opacity 0.5s',
  }
};

export class Notes extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = { loading: true, modified: false, errored: false, text: '' };
    this.selection = null;
    this.handleChanges = this.handleChanges.bind(this);
    this.setStoryNotes = this.setStoryNotes.bind(this);
    this.setStoryNotes = debounce(this.setStoryNotes, 500);
  }

  componentDidMount() {
    // Clear the current notes on every story change.
    this.stopListeningOnStory = this.props.api.onStory((kind, story) => {
      this.selection = null;
      this.setState({ errored: false, loading: true, text: '' });
      const db = addons.getDatabase();
      db.getCollection(COLLECTION_ID).get({sbKind: kind, sbStory: story})
        .then(res => this.showFetchedNotes(kind, story, res[0]))
        .catch(err => this.showLoadError(err));
    });
  }

  // This is some cleanup tasks when the Notes panel is unmounting.
  componentWillUnmount() {
    if (this.stopListeningOnStory) {
      this.stopListeningOnStory();
    }
    this.unmounted = true;
  }

  setStoryNotes(id, kind, story, notes) {
    const db = addons.getDatabase();
    const doc = { id, notes, sbKind: kind, sbStory: story };
    db.getCollection(COLLECTION_ID).set(doc)
      .then(doc => this.setState({ modified: false }));
  }

  showFetchedNotes(kind, story, doc) {
    if (!doc) {
      // no notes are saved for this story, start a new doc with new id
      this.selection = { kind, story, id: uuid.v4() };
      this.setState({ errored: false, loading: false, text: '' });
    } else {
      this.selection = { kind, story, id: doc.id };
      this.setState({ errored: false, loading: false, text: doc.notes });
    }
  }

  showLoadError(err) {
    const text = `Error: ${err.message}`;
    this.setState({ errored: true, loading: false, text });
  }

  handleChanges(e) {
    const { id, kind, story } = this.selection;
    const notes = e.target.value;
    this.setState({ modified: true, text: notes });
    this.setStoryNotes(id, kind, story, notes);
  }

  renderTextarea() {
    const { text, errored } = this.state;
    const textStyle = Object.assign({}, styles.textarea);
    if (errored) {
      Object.assign(textStyle, styles.errorText);
    }
    return (
      <textarea
        style={textStyle}
        value={text}
        onChange={this.handleChanges}
      />
    );
  }

  renderSaveIcon() {
    const { modified } = this.state;
    const messageStyle = Object.assign({}, styles.modifiedMessage);
    if (modified) {
      messageStyle.opacity = 0.5;
    }
    return <div style={messageStyle}>⟲</div>;
  }

  render() {
    return (
      <div style={styles.wrapper}>
        {this.renderTextarea()}
        {this.renderSaveIcon()}
      </div>
    );
  }
}

Notes.propTypes = {
  api: React.PropTypes.object,
};

// Register the addon with a unique name.
addons.register(ADDON_ID, (api) => {
  // Also need to set a unique name to the panel.
  addons.addPanel(PANEL_ID, {
    title: 'Notes',
    render: () => (
      <Notes api={api} />
    ),
  });
});
