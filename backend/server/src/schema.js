export const typeDefs = `#graphql
  type User {
    id: ID!
    username: String!
    role: String!
  }

  type AuthPayload {
    success: Boolean!
    message: String!
    user: User
    accessToken: String
    refreshToken: String
  }

  type Study {
    id: ID!
    name: String!
    sponsor: String
    phase: String
    protocolId: String
    startDate: String
    endDate: String
    status: String
    assignmentStatus: String
    siteName: String
    sites: [Site!]!
    examiners: [Examiner!]!
  }

  type Site {
    id: ID!
    name: String!
    city: String
    country: String
    status: String
    assignmentStatus: String
    studies: [Study!]!
    examiners: [Examiner!]!
  }

  type Examiner {
    id: ID!
    name: String!
    role: String
    assignmentStatus: String
    siteName: String
    studyNames: [String!]
    sites: [Site!]!
    studies: [Study!]!
    certificates: [Certificate!]!
  }

  type Certificate {
    id: ID!
    examinerId: ID!
    studyId: ID!
    studyName: String!
    expiryDate: String!
    status: String!
    daysLeft: Int!
  }

  type StatusCount {
    name: String!
    value: Int!
  }

  type DashboardStats {
    totalStudies: Int!
    activeSites: Int!
    totalExaminers: Int!
    studyByStatus: [StatusCount!]!
    siteByStatus: [StatusCount!]!
    examinerByRole: [StatusCount!]!
    studySiteDistribution: [StudySiteCount!]!
  }

  type StudySiteCount {
    studyName: String!
    siteCount: Int!
    phase: String
    status: String
  }

  type SearchResults {
    studies: [Study!]!
    sites: [Site!]!
    examiners: [Examiner!]!
  }

  type MutationResult {
    success: Boolean!
    message: String!
  }

  type AuditLog {
    id: ID!
    action: String!
    entity: String!
    entityId: Int
    details: String
    createdAt: String!
  }

  type PaginatedStudies {
    data: [Study!]!
    totalCount: Int!
    totalPages: Int!
  }

  type PaginatedSites {
    data: [Site!]!
    totalCount: Int!
    totalPages: Int!
  }

  type PaginatedExaminers {
    data: [Examiner!]!
    totalCount: Int!
    totalPages: Int!
  }

  type Query {
    studies(page: Int, limit: Int, search: String, phase: String, status: String): PaginatedStudies!
    study(id: ID!): Study
    sites(page: Int, limit: Int, search: String, status: String): PaginatedSites!
    site(id: ID!): Site
    examiners(page: Int, limit: Int, search: String): PaginatedExaminers!
    examiner(id: ID!): Examiner
    dashboard: DashboardStats!
    search(query: String!, phase: String, status: String): SearchResults!
    studiesBySite(siteId: ID!): [Study!]!
    examinersBySite(siteId: ID!): [Examiner!]!
    certifiedExaminersForStudy(siteId: ID!, studyId: ID!): [Examiner!]!
    assignedSiteIdsForStudy(studyId: ID!): [ID!]!
    auditLogs(entity: String!, entityId: ID!): [AuditLog!]!
    recentActivities(limit: Int): [AuditLog!]!
  }

  type Mutation {
    signup(username: String!, password: String!): AuthPayload!
    login(username: String!, password: String!): AuthPayload!
    createStudy(name: String!, sponsor: String, phase: String, startDate: String, endDate: String, status: String): Study!
    createSite(name: String!, city: String, country: String, status: String): Site!
    createExaminer(name: String!, role: String): Examiner!
    assignSitesToStudy(studyId: ID!, siteIds: [ID!]!, examinerIds: [ID!]): MutationResult!
    assignExaminerToSite(examinerId: ID!, siteId: ID!): MutationResult!
    updateStudy(id: ID!, name: String, sponsor: String, phase: String, startDate: String, endDate: String, status: String): Study!
    updateSite(id: ID!, name: String, city: String, country: String, status: String): Site!
    updateExaminer(id: ID!, name: String, role: String): Examiner!
    unassignSiteFromStudy(studyId: ID!, siteId: ID!): MutationResult!
    reassignSiteToStudy(studyId: ID!, siteId: ID!): MutationResult!
    unassignExaminerFromSite(siteId: ID!, examinerId: ID!): MutationResult!
    reassignExaminerToSite(siteId: ID!, examinerId: ID!): MutationResult!
    addCertificate(examinerId: ID!, studyId: ID!, expiryDate: String!): Certificate!
    updateCertificate(id: ID!, expiryDate: String!): Certificate!
  }
`;
