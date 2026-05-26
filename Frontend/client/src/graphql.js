import { gql } from "@apollo/client";

export const GET_DASHBOARD = gql`
  query {
    dashboard {
      totalStudies
      activeSites
      totalExaminers
      studyByStatus { name value }
      siteByStatus { name value }
      examinerByRole { name value }
      studySiteDistribution { studyName siteCount phase status }
    }
  }
`;

export const GET_STUDIES = gql`
  query GetStudies($page: Int, $limit: Int, $search: String, $phase: String, $status: String) {
    studies(page: $page, limit: $limit, search: $search, phase: $phase, status: $status) {
      data { id name sponsor phase protocolId startDate endDate status }
      totalCount totalPages
    }
  }
`;

export const GET_STUDY = gql`
  query GetStudy($id: ID!) {
    study(id: $id) {
      id name sponsor phase protocolId startDate endDate status
      sites { id name city country status assignmentStatus }
      examiners { id name role assignmentStatus siteName }
    }
  }
`;

export const GET_SITES = gql`
  query GetSites($page: Int, $limit: Int, $search: String, $status: String) {
    sites(page: $page, limit: $limit, search: $search, status: $status) {
      data { id name city country status }
      totalCount totalPages
    }
  }
`;

export const GET_SITE = gql`
  query GetSite($id: ID!) {
    site(id: $id) {
      id name city country status
      studies { id name sponsor phase status assignmentStatus }
      examiners { id name role assignmentStatus studyNames }
    }
  }
`;

export const GET_EXAMINERS = gql`
  query GetExaminers($page: Int, $limit: Int, $search: String) {
    examiners(page: $page, limit: $limit, search: $search) {
      data { id name role }
      totalCount totalPages
    }
  }
`;

export const GET_EXAMINER = gql`
  query GetExaminer($id: ID!) {
    examiner(id: $id) {
      id name role
      sites { id name city country status }
      studies { id name sponsor phase status siteName }
      certificates { id studyId studyName expiryDate status daysLeft }
    }
  }
`;

export const SEARCH = gql`
  query Search($query: String!, $phase: String, $status: String) {
    search(query: $query, phase: $phase, status: $status) {
      studies { id name sponsor phase status }
      sites { id name city country status }
      examiners { id name role }
    }
  }
`;

export const STUDIES_BY_SITE = gql`
  query StudiesBySite($siteId: ID!) {
    studiesBySite(siteId: $siteId) { id name phase status }
  }
`;

export const EXAMINERS_BY_SITE = gql`
  query ExaminersBySite($siteId: ID!) {
    examinersBySite(siteId: $siteId) { id name role }
  }
`;

export const CERTIFIED_EXAMINERS = gql`
  query CertifiedExaminersForStudy($siteId: ID!, $studyId: ID!) {
    certifiedExaminersForStudy(siteId: $siteId, studyId: $studyId) { id name role }
  }
`;

export const ASSIGNED_SITE_IDS = gql`
  query AssignedSiteIdsForStudy($studyId: ID!) {
    assignedSiteIdsForStudy(studyId: $studyId)
  }
`;

export const CREATE_STUDY = gql`
  mutation CreateStudy($name: String!, $sponsor: String, $phase: String, $startDate: String, $endDate: String, $status: String) {
    createStudy(name: $name, sponsor: $sponsor, phase: $phase, startDate: $startDate, endDate: $endDate, status: $status) { id name protocolId }
  }
`;

export const CREATE_SITE = gql`
  mutation CreateSite($name: String!, $city: String, $country: String, $status: String) {
    createSite(name: $name, city: $city, country: $country, status: $status) { id name }
  }
`;

export const CREATE_EXAMINER = gql`
  mutation CreateExaminer($name: String!, $role: String) {
    createExaminer(name: $name, role: $role) { id name }
  }
`;

export const ASSIGN_SITES_TO_STUDY = gql`
  mutation AssignSitesToStudy($studyId: ID!, $siteIds: [ID!]!, $examinerIds: [ID!]) {
    assignSitesToStudy(studyId: $studyId, siteIds: $siteIds, examinerIds: $examinerIds) { success message }
  }
`;

export const ASSIGN_EXAMINER_TO_SITE = gql`
  mutation AssignExaminerToSite($examinerId: ID!, $siteId: ID!) {
    assignExaminerToSite(examinerId: $examinerId, siteId: $siteId) { success message }
  }
`;

export const UPDATE_STUDY = gql`
  mutation UpdateStudy($id: ID!, $name: String, $sponsor: String, $phase: String, $startDate: String, $endDate: String, $status: String) {
    updateStudy(id: $id, name: $name, sponsor: $sponsor, phase: $phase, startDate: $startDate, endDate: $endDate, status: $status) { id name }
  }
`;

export const UPDATE_SITE = gql`
  mutation UpdateSite($id: ID!, $name: String, $city: String, $country: String, $status: String) {
    updateSite(id: $id, name: $name, city: $city, country: $country, status: $status) { id name }
  }
`;

export const UPDATE_EXAMINER = gql`
  mutation UpdateExaminer($id: ID!, $name: String, $role: String) {
    updateExaminer(id: $id, name: $name, role: $role) { id name }
  }
`;

export const UNASSIGN_SITE_FROM_STUDY = gql`
  mutation UnassignSiteFromStudy($studyId: ID!, $siteId: ID!) {
    unassignSiteFromStudy(studyId: $studyId, siteId: $siteId) { success message }
  }
`;

export const UNASSIGN_EXAMINER_FROM_SITE = gql`
  mutation UnassignExaminerFromSite($siteId: ID!, $examinerId: ID!) {
    unassignExaminerFromSite(siteId: $siteId, examinerId: $examinerId) { success message }
  }
`;

export const REASSIGN_SITE_TO_STUDY = gql`
  mutation ReassignSiteToStudy($studyId: ID!, $siteId: ID!) {
    reassignSiteToStudy(studyId: $studyId, siteId: $siteId) { success message }
  }
`;

export const REASSIGN_EXAMINER_TO_SITE = gql`
  mutation ReassignExaminerToSite($siteId: ID!, $examinerId: ID!) {
    reassignExaminerToSite(siteId: $siteId, examinerId: $examinerId) { success message }
  }
`;

export const GET_AUDIT_LOGS = gql`
  query AuditLogs($entity: String!, $entityId: ID!) {
    auditLogs(entity: $entity, entityId: $entityId) { id action details createdAt }
  }
`;

export const GET_RECENT_ACTIVITIES = gql`
  query RecentActivities($limit: Int) {
    recentActivities(limit: $limit) { id action entity entityId details createdAt }
  }
`;

export const ADD_CERTIFICATE = gql`
  mutation AddCertificate($examinerId: ID!, $studyId: ID!, $expiryDate: String!) {
    addCertificate(examinerId: $examinerId, studyId: $studyId, expiryDate: $expiryDate) { id studyName expiryDate status }
  }
`;

export const UPDATE_CERTIFICATE = gql`
  mutation UpdateCertificate($id: ID!, $expiryDate: String!) {
    updateCertificate(id: $id, expiryDate: $expiryDate) { id studyName expiryDate status daysLeft }
  }
`;
