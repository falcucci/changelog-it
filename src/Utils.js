/**
 * Utils it's a group of functions that help us generically
 */
import _ from 'lodash';
import IssueTypes from './IssueTypes';
import JiraIssueTypes from './JiraIssueTypes';

/**
 * TODO:
 *
 */
const mapIssueTypes = type => {
  return {
    [JiraIssueTypes.BREAKING_CHANGE]: IssueTypes.BREAKING_CHANGE,
    [JiraIssueTypes.FEATURE]: IssueTypes.FEATURE,
    [JiraIssueTypes.ENHANCEMENT]: IssueTypes.ENHANCEMENT,
    [JiraIssueTypes.SUBTASK]: IssueTypes.ENHANCEMENT,
    [JiraIssueTypes.BUG]: IssueTypes.BUG,
    [JiraIssueTypes.INTERNAL]: IssueTypes.INTERNAL,
    [JiraIssueTypes.DOCUMENTATION]: IssueTypes.DOCUMENTATION
  }[type]
}

/**
 * TODO:
 *
 */
const mapSessions = (objects, prop) => {
  return _.filter(objects, prop)
}

module.exports.mapIssueTypes = mapIssueTypes;
module.exports.mapSessions = mapSessions;
