import React from 'react';
import addons from '@kadira/storybook-addons';

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
  }
};

export class Notes extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = { modified: false, loading: false, errored: false, text: '' };
    this.onAddNotes = this.onAddNotes.bind(this);
    this.onTextChange = this.onTextChange.bind(this);
  }

  componentDidMount() {
    // Clear the current notes on every story change.
    this.stopListeningOnStory = this.props.api.onStory((kind, story) => {
      this.setState({ errored: false, loading: true, text: '' });
      this.getStoryNotes(kind, story)
        .then(text => this.onAddNotes(text))
        .catch(err => this.onNetError(err));
    });
  }

  // This is some cleanup tasks when the Notes panel is unmounting.
  componentWillUnmount() {
    if (this.stopListeningOnStory) {
      this.stopListeningOnStory();
    }
    this.unmounted = true;
  }

  getStoryNotes(kind, story) {
    const db = addons.getDatabase();
    return db.getCollection(COLLECTION_ID)
      .get({sbKind: kind, sbStory: story})
      .then(res => res[0] && res[0].notes || '');
  }

  onAddNotes(text) {
    this.setState({ errored: false, modified: false, loading: false, text });
  }

  onNetError(err) {
    const text = `Error: ${err.message}`;
    this.setState({ errored: true, modified: false, loading: false, text });
  }

  onTextChange(e) {
    this.setState({ modified: true, text: e.target.value });
  }

  render() {
    const { text, errored, loading } = this.state;
    const textStyle = Object.assign({}, styles.textarea);
    if (errored) {
      Object.assign(textStyle, styles.errorText);
    }

    return (
      <div style={styles.wrapper}>
        <textarea style={textStyle} value={text} onChange={this.onTextChange} />
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
