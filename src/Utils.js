/**
 * Utils it's a group of functions that help us generically
 */
import IssueTypes from './IssueTypes';
import JiraIssueTypes from './JiraIssueTypes';


const mapIssueTypes = type => {
  return {
    [JiraIssueTypes.INTERNAL]: IssueTypes.INTERNAL,
    [JiraIssueTypes.BUG]: IssueTypes.BUG,
    [JiraIssueTypes.FEATURE]: IssueTypes.FEATURE,
    [JiraIssueTypes.ENHANCEMENT]: IssueTypes.ENHANCEMENT
    [JiraIssueTypes.DOCUMENTATION]: IssueTypes.DOCUMENTATION
    [JiraIssueTypes.BREAKING_CHANGE]: IssueTypes.BREAKING_CHANGE
  }[type]
}

module.exports.mapIssueTypes = mapIssueTypes;
