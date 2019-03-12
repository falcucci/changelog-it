/**
 * Utils it's a group of functions that help us generically
 */
import IssueTypes from './IssueTypes';
import JiraIssueTypes from './JiraIssueTypes';


const mapIssueTypes = type => {
  return {
    [JiraIssueTypes.INTERNAL]: IssueTypes.INTERNAL
  }[type]
}

module.exports.mapIssueTypes = mapIssueTypes;
