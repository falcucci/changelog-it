import "@babel/polyfill";
import _ from "lodash";
import fetch from 'node-fetch';
import urlencoded from 'form-urlencoded';
import PromiseThrottle from 'promise-throttle';

// Cache of GET requests
const cache = {};

// Cache of pending GET requests
const pending = {};

/**
 * Gitlab wrapper to get informations from v4 gitlab api
 */
export default class Gitlab {
  constructor(config) {
    this.config = config;
  }

  /**
   * Is the gitlab integration enabled
   */
  isEnabled() {
    return (
      this.config.gitlab &&
      this.config.gitlab.api &&
      this.config.gitlab.api.user &&
      this.config.gitlab.api.host &&
      this.config.gitlab.api.apiKey
    );
  }

  /**
   * Make an API call and return the repsponse
   *
   * @param {String} endpoint - The API endpoint name. (i.e '/projects/')
   * @param {String} method - The HTTP method to use (i.e. GET)
   * @param {Object} body - The request body for POST or PUT.
   * This will be serialized to application/x-www-form-urlencoded
   *
   * @return {Promise}
   */
  api(endpoint, method='GET', body=undefined) {

    const headers = {
      "PRIVATE-TOKEN": this.config.gitlab.api.apiKey
    };

    const cachable = (method.toUpperCase() === 'GET');
    const url = `${this.config.gitlab.api.host}/api/v4/${endpoint}`;

    if (!this.isEnabled()) {
      return Promise.reject('The gitlab API is not configured.');
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
    console.log('url: ', url);

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
   * TODO
   *
   */
  generateRelease(projectId, releaseVersion, description) {
    /** No gitlab integration */
    if (!this.isEnabled()) {
      return Promise.resolve([])
    }
    /**
     * format the organization/user id to encode it with the project name
     */
    const user = (
      this.config.gitlab.api.user
      ? `${this.config.gitlab.api.user}/`
      : ''
    )

    projectId = encodeURIComponent(`${user}${projectId}`)
    const url = `projects/${projectId}/releases`
    const opts = {
      id: projectId,
      name: releaseVersion,
      tag_name: releaseVersion,
      description
    }

    return this.api(url, "POST", opts).then(response => {
      if (!response || response.error) {
        const err = (
          response ? response.error : "No response from server"
        )
        console.error("Could not create a gitlab merge request:", err);
        return Promise.reject(err);
      }
      return Promise.resolve(response);
    });
  }

  /**
   * TODO
   *
   */
  getMergeRequests(source, projectId, timestamp, target) {
    // No gitlab integration
    if (!this.isEnabled()) {
      return Promise.resolve([]);
    }

    // Already loaded MR's
    if (this.mergeRequests) {
      return Promise.resolve(this.mergeRequests);
    }

    const targetDate = new Date(target.replace('T', ' '));

    /**
     * format the organization/user id to encode it with the project name
     */
    const user = (
      this.config.gitlab.api.user
      ? `${this.config.gitlab.api.user}/`
      : ''
    )

    projectId = encodeURIComponent(`${user}${projectId}`)

    /**
     * TODO: add target_branch query string
     *
     */
    const url = (
      `projects/${projectId}/merge_requests` +
      `?state=merged&updated_after=${timestamp}` +
      `&per_page=99999`
    )
    // Get merge requests
    return this.api(url)
    .then(async (response) => {
      if (!response || response.error) {
        const err = (
          (response) ? response.error : 'No response from server'
        )
        console.error('Could not load gitlab merge requests:', err);
        return Promise.reject(err);
      }
      this.mergeRequests = _.filter(response, async mr => {
        const merged_at = new Date(mr.updated_at);
        const t = new Date(timestamp);
        return merged_at >= t
      });

      this.mergeRequests = await Promise.all(
        _.map(this.mergeRequests, async mr => {
          mr.release_tag = await source.getMergeRequestRelease(
            mr.merge_commit_sha
          )
          return mr;
        })
      )


      return this.mergeRequests;
    });
  }
}
