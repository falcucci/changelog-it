import fetch from 'node-fetch';
import urlencoded from 'form-urlencoded';

const API_ROOT = 'https://slack.com/api/';
const MSG_SIZE_LIMIT = 4000;

// Cache of GET requests
const cache = {};

// Cache of pending GET requests
const pending = {};

/**
 * Manages the slack integration.
 */
export default class Slack {

  constructor(config) {
    this.config = config;
    this.slackUsers = false;
  }

  /**
   * Is the slack integration enabled
   */
  isEnabled() {
    return (this.config.slack && this.config.slack.apiKey);
  }

  /**
   * Make an API call and return the repsponse
   *
   * @param {String} endpoint - The API endpoint name. (i.e 'users.list')
   * @param {String} method - The HTTP method to use (i.e. GET)
   * @param {Object} body - The request body for POST or PUT. This will be serialized to application/x-www-form-urlencoded
   *
   * @return {Promise}
   */
  api(endpoint, method='GET', body=undefined) {
    const headers = {};
    const cachable = (method.toUpperCase() === 'GET');
    const url = `${API_ROOT}/${endpoint}?token=${this.config.slack.apiKey}`;

    if (!this.isEnabled()) {
      return Promise.reject('The slack API is not configured.');
    }

    if (typeof body === 'object') {
      body = urlencoded(body);
    }
    if (method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    else if (cachable && cache[url]) {
      return Promise.resolve(cache[url]);
    }
    else if (method === 'GET' && pending[url]) {
      return pending[url];
    }

    pending[url] = fetch(url, { method, body, headers })
    .then(res => res.json())
    .then((data) => {
      // Cache result
      if (cachable && data && data.ok) {
        cache[url] = data;
      }
      return data;
    });

    return pending[url];
  }

  /**
   * Load all the slack users.
   *
   * @returns {Promise} Resolves to the user object list
   */
  getSlackUsers() {

    // No slack integration
    if (!this.isEnabled()) {
      return Promise.resolve([]);
    }

    // Already loaded users
    if (this.slackUsers) {
      return Promise.resolve(this.slackUsers);
    }

    // Get users
    return this.api("users.list")
    .then((response) => {
      if (!response || response.error) {
        const err = (response) ? response.error : 'No response from server';
        console.error('Could not load slack users:', err);
        return Promise.reject(err);
      }

      this.slackUsers = response.members;
      return this.slackUsers;
    });
  }

  /**
   * Try to find a slack user by email and/or name
   *
   * @param {String} email - The email address to use to lookup the slack user.
   * @param {String} name - The full name to use to lookup the slack user.
   * @return {Promise} Resolves to the slack user object or undefined
   */
  findUser(email, name) {
    return this.getSlackUsers()
    .then((users) => {
      // Try by email first (more exact match)
      email = email.toLowerCase();
      let found = users.find(
        u => u.profile.email && u.profile.email.toLowerCase() === email
      );

      // Fallback to name
      if (!found && name) {
        name = name.toLowerCase();
        found = users.find(u => {
          const profile = u.profile;
          return (
            (profile.real_name && profile.real_name.toLowerCase() === name) ||
            (profile.real_name_normalized &&
              profile.real_name_normalized.toLowerCase() === name)
          );
        });
      }

      return found;
    });
  }

  /**
   * Post a message to a slack channel.
   * If the message is longer than slack's limit, it will be cut into multiple messages.
   *
   * @param {String} text - The message to send to slack
   * @param {String} channel - The slack channel ID to send the message to.
   * (i.e. `#engineering`)
   * @param {String} releaseVersion - The name of the release version to create.
   * @param {String} projectName - The name of the project.
   * @return {Promise} Resolves when message has sent
   */
  postMessage(content, channels, releaseVersion, projectName) {
    // No message
    if (!content || !content.length) {
      return Promise.reject('No content to send to slack.');
    }

    // No slack integration
    if (!this.isEnabled()) {
      return Promise.resolve({});
    }

    const chunks = this.splitUpMessage(content);

    // Send all message chunks
    const sendPromise = chunks.reduce((promise, content) => {
      return promise.then(() => sendChunk(content));
    }, Promise.resolve());

    // Sends a single message to the channels and returns a promise
    const self = this;
    function sendChunk(content) {
      return self.api('files.upload', 'POST',
        {
          title: `${projectName}-${releaseVersion}`,
          content,
          filename: `${projectName}-${releaseVersion}`,
          filetype: 'post',
          channels,
          as_user: true,
          parse: 'full',
          pretty: 1,
          username: self.config.slack.username,
          icon_emoji: self.config.slack.icon_emoji,
          icon_url: self.config.slack.icon_url
        }).then((response) => {
          if (response && !response.ok) {
            throw response.error;
          }
          return response;
        }
      );
    }

    return sendPromise;
  }

  /**
   * Cut a message into chunks that fit Slack's message length limits.
   * The text will be divided by newline characters, where possible.
   *
   * @param {String} text - The message text to split up.
   *
   * @return {Array}
   */
  splitUpMessage(text) {
    if (text.length <= MSG_SIZE_LIMIT) {
      return [text];
    }

    const lines = text.split('\n');
    const messages = [];
    const continuation = '...';
    const limit = MSG_SIZE_LIMIT - continuation.length;
    let block = '';

    lines.forEach((line) => {
      const tmpBlock = `${block}${line}\n`;

      // Within size limit
      if (tmpBlock.length <= MSG_SIZE_LIMIT) {
        block = tmpBlock;
      }
      // Bigger than size limit
      else {

        // Add last block and start new one
        if (block.length) {
          messages.push(block);
          block = line;
        }

        // No existing block, this line must be loner than the limit
        else {
          while (line.length > 0) {
            let last = line.substr(0, limit).trim();
            line = line.substr(limit).trim();

            // Add continuation characters
            if (line.length) {
              last += continuation;
              line = `${continuation}${line}`;
            }
            messages.push(last);
          }
        }
      }
    });
    if (block) {
      messages.push(block);
    }

    return messages;
  }
}
