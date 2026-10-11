/**
 * Comprehensive Integration Test Runner for CRM Sales Management System
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '5055';
require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');

let server;
let baseUrl;

const request = async (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({
            status: res.statusCode,
            body: parsed,
          });
        });
      }
    );

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

async function runTests() {
  await connectDB();
  const TEST_PORT = 5055;
  server = app.listen(TEST_PORT);
  baseUrl = `http://localhost:${TEST_PORT}`;

  console.log('\n--- 1. Testing Health & Root Endpoint ---');
  const healthRes = await request('GET', '/api/v1/health');
  console.log('Health Check Status:', healthRes.status, healthRes.body.message);
  if (healthRes.status !== 200) throw new Error('Health check failed');

  console.log('\n--- 2. Testing Auth Registration (Exact Roles) ---');
  const timestamp = Date.now();
  const adminEmail = `admin_${timestamp}@crmtest.com`;
  const managerEmail = `manager_${timestamp}@crmtest.com`;
  const execEmail = `exec_${timestamp}@crmtest.com`;

  const adminReg = await request('POST', '/api/v1/auth/register', {
    name: 'Admin Boss',
    email: adminEmail,
    password: 'Password123!',
    role: 'admin',
    department: 'Management',
  });
  console.log('Admin Register:', adminReg.status, adminReg.body.message);
  const adminToken = adminReg.body.data.token;
  const adminUser = adminReg.body.data.user;

  const managerReg = await request('POST', '/api/v1/auth/register', {
    name: 'Maya Manager',
    email: managerEmail,
    password: 'Password123!',
    role: 'sales_manager',
    department: 'Sales Ops',
  });
  console.log('Sales Manager Register:', managerReg.status, managerReg.body.message);
  const managerToken = managerReg.body.data.token;

  const execReg = await request('POST', '/api/v1/auth/register', {
    name: 'Sam Executive',
    email: execEmail,
    password: 'Password123!',
    role: 'sales_executive',
    department: 'Outbound',
  });
  console.log('Sales Executive Register:', execReg.status, execReg.body.message);
  const execToken = execReg.body.data.token;
  const execUser = execReg.body.data.user;

  console.log('\n--- 2.0 Testing Negative Authentication & Input Edge Cases ---');
  // 1. Missing required fields on registration (expected 400)
  const missingFieldRes = await request('POST', '/api/v1/auth/register', {
    name: 'Incomplete User',
  });
  console.log('Missing required fields (expected 400):', missingFieldRes.status, missingFieldRes.body.message);
  if (missingFieldRes.status !== 400 || !Array.isArray(missingFieldRes.body.errors)) {
    throw new Error('Missing required fields validation failed');
  }

  // 2. Duplicate email handling (expected 409)
  const dupEmailRes = await request('POST', '/api/v1/auth/register', {
    name: 'Duplicate Admin',
    email: adminEmail,
    password: 'Password123!',
    role: 'admin',
  });
  console.log('Duplicate email registration (expected 409):', dupEmailRes.status, dupEmailRes.body.message);
  if (dupEmailRes.status !== 409) throw new Error('Duplicate email conflict handling failed');

  // 3. Missing authentication header (expected 401)
  const missingAuthRes = await request('GET', '/api/v1/leads');
  console.log('Missing Authorization header (expected 401):', missingAuthRes.status);
  if (missingAuthRes.status !== 401) throw new Error('Missing authentication check failed');

  // 4. Invalid / Malformed token (expected 401)
  const invalidTokenRes = await request('GET', '/api/v1/leads', null, 'malformed.or.invalid.token');
  console.log('Invalid/malformed token (expected 401):', invalidTokenRes.status);
  if (invalidTokenRes.status !== 401) throw new Error('Invalid token rejection failed');

  // 5. Invalid ObjectId format (expected 400)
  const invalidIdRes = await request('GET', '/api/v1/leads/not-valid-hex-id', null, execToken);
  console.log('Invalid MongoDB ID format (expected 400):', invalidIdRes.status, invalidIdRes.body.message);
  if (invalidIdRes.status !== 400) throw new Error('Invalid ID validation failed');

  // 6. Invalid Enum value (expected 400)
  const invalidEnumRes = await request(
    'POST',
    '/api/v1/leads',
    {
      name: 'Invalid Enum Lead',
      source: 'InvalidSourceNonExistent',
    },
    execToken
  );
  console.log('Invalid Enum value (expected 400):', invalidEnumRes.status, invalidEnumRes.body.message);
  if (invalidEnumRes.status !== 400) throw new Error('Invalid enum validation failed');

  console.log('\n--- 2.1 Testing Current User Profile & Sensitive Field Protection ---');
  const meRes = await request('GET', '/api/v1/auth/me', null, adminToken);
  console.log('Get /auth/me Status:', meRes.status);
  if (meRes.status !== 200 || meRes.body.data.user.password) {
    throw new Error('Sensitive password exposed in profile!');
  }

  console.log('\n--- 2.2 Testing Logout with Token Invalidation Strategy ---');
  const tempUserEmail = `logout_${timestamp}@crmtest.com`;
  const tempReg = await request('POST', '/api/v1/auth/register', {
    name: 'Temporary User',
    email: tempUserEmail,
    password: 'Password123!',
    role: 'sales_executive',
  });
  const tempToken = tempReg.body.data.token;
  const tempUserId = tempReg.body.data.user._id || tempReg.body.data.user.id;

  // Logout with this token
  const logoutRes = await request('POST', '/api/v1/auth/logout', null, tempToken);
  console.log('Logout Status:', logoutRes.status, logoutRes.body.message);

  // Attempt using revoked token
  const revokedAccessRes = await request('GET', '/api/v1/auth/me', null, tempToken);
  console.log('Accessing /auth/me with revoked token (expected 401):', revokedAccessRes.status);
  if (revokedAccessRes.status !== 401) throw new Error('Token invalidation strategy failed');

  console.log('\n--- 2.3 Testing Inactive User Protection ---');
  // Log in again to get fresh token for temp user
  const tempLogin = await request('POST', '/api/v1/auth/login', {
    email: tempUserEmail,
    password: 'Password123!',
  });
  const freshTempToken = tempLogin.body.data.token;

  // Admin deactivates temp user
  await request('PATCH', `/api/v1/users/${tempUserId}/status`, { isActive: false }, adminToken);

  // Attempt to access with deactivated user's token
  console.log('tempLogin status:', tempLogin.status);
  const inactiveAccessRes = await request('GET', '/api/v1/auth/me', null, freshTempToken);
  console.log('Deactivated user accessing API (expected 403):', inactiveAccessRes.status, inactiveAccessRes.body.message);
  if (inactiveAccessRes.status !== 403) throw new Error('Inactive user check failed');

  console.log('\n--- 3. Testing User Management (Phase 3) ---');
  const execAccessUsers = await request('GET', '/api/v1/users', null, execToken);
  console.log('Exec accessing admin users list (expected 403):', execAccessUsers.status);
  if (execAccessUsers.status !== 403) throw new Error('RBAC check failed');

  const managerAccessUsers = await request('GET', '/api/v1/users', null, managerToken);
  console.log('Manager accessing users list (expected 200):', managerAccessUsers.status);
  if (managerAccessUsers.status !== 200) throw new Error('Manager users list check failed');

  // Search by name & email
  const searchUsers = await request('GET', '/api/v1/users?search=Sam', null, adminToken);
  console.log('Admin search users by keyword:', searchUsers.status, `Found: ${searchUsers.body.data.length} users`);
  if (searchUsers.status !== 200) throw new Error('User search failed');

  // Filter by role and status, pagination and sorting
  const filterUsers = await request(
    'GET',
    '/api/v1/users?role=sales_executive&isActive=true&page=1&limit=10&sortBy=name&sortOrder=asc',
    null,
    adminToken
  );
  console.log('Admin filter users by role & active status:', filterUsers.status, `Total: ${filterUsers.body.meta.total}`);
  if (filterUsers.status !== 200) throw new Error('User filtering failed');

  // Admin updates user details
  const updateSamRes = await request(
    'PUT',
    `/api/v1/users/${execUser._id}`,
    { department: 'Enterprise Inside Sales' },
    adminToken
  );
  console.log('Admin update user details:', updateSamRes.status, 'New dept:', updateSamRes.body.data.user.department);
  if (updateSamRes.status !== 200) throw new Error('Admin user update failed');

  // Non-admin attempting to update user (expected 403)
  const execUpdateFail = await request(
    'PUT',
    `/api/v1/users/${execUser._id}`,
    { department: 'Hacked Dept' },
    execToken
  );
  console.log('Exec attempting admin update (expected 403):', execUpdateFail.status);
  if (execUpdateFail.status !== 403) throw new Error('Non-admin restriction failed');

  console.log('\n--- 4. Testing Lead Management (Phase 4) ---');
  // Register second sales executive to test isolation between executives
  const exec2Reg = await request('POST', '/api/v1/auth/register', {
    name: 'Robin SecondExec',
    email: `robin_${timestamp}@crmtest.com`,
    password: 'Password123!',
    role: 'sales_executive',
  });
  const exec2Token = exec2Reg.body.data.token;

  const createLeadRes = await request(
    'POST',
    '/api/v1/leads',
    {
      name: 'Global Tech Lead',
      email: `lead_${timestamp}@globaltech.com`,
      phone: '+1 555-8888',
      company: 'Global Tech Inc',
      source: 'LinkedIn',
      status: 'New',
      priority: 'High',
      description: 'Looking to acquire sales management solution',
      estimatedValue: 60000,
    },
    adminToken
  );
  console.log('Create Lead Status:', createLeadRes.status, createLeadRes.body.message);
  const leadId = createLeadRes.body.data.lead._id;

  // Search & multiple filters on leads
  const filterLeadsRes = await request(
    'GET',
    '/api/v1/leads?search=Global&source=LinkedIn&status=New&priority=High&page=1&limit=5&sortBy=createdAt&sortOrder=desc',
    null,
    adminToken
  );
  console.log('Multi-filter leads search:', filterLeadsRes.status, `Count: ${filterLeadsRes.body.data.length}`);
  if (filterLeadsRes.status !== 200) throw new Error('Multi-filter leads search failed');

  console.log('\n--- 4.1 Testing Phase 5: Assignment & Conversion Rules ---');
  // Unauthorized assignment attempt by sales executive (expected 403)
  const execAssignFail = await request(
    'PATCH',
    `/api/v1/leads/${leadId}/assign`,
    { assignedTo: execUser._id },
    execToken
  );
  console.log('Sales Executive assigning lead (expected 403):', execAssignFail.status);
  if (execAssignFail.status !== 403) throw new Error('Unauthorized lead assignment check failed');

  // Assignment to inactive user (expected 400)
  const assignInactiveFail = await request(
    'PATCH',
    `/api/v1/leads/${leadId}/assign`,
    { assignedTo: tempUserId },
    managerToken
  );
  console.log('Assign lead to inactive user (expected 400):', assignInactiveFail.status);
  if (assignInactiveFail.status !== 400) throw new Error('Assign to inactive user check failed');

  // Authorized assignment by Manager to Sales Executive 1 (Sam)
  const assignRes = await request(
    'PATCH',
    `/api/v1/leads/${leadId}/assign`,
    { assignedTo: execUser._id },
    managerToken
  );
  console.log('Authorized Lead Assignment Status:', assignRes.status, 'Assigned to:', assignRes.body.data.lead.assignedTo.name);

  // Attempting to convert unqualified lead while status is 'New' (expected 400)
  const convertUnqualifiedFail = await request(
    'POST',
    `/api/v1/leads/${leadId}/convert`,
    { createDeal: true },
    execToken
  );
  console.log('Converting unqualified lead (expected 400):', convertUnqualifiedFail.status);
  if (convertUnqualifiedFail.status !== 400) throw new Error('Unqualified lead conversion check failed');

  // Update lead priority
  const priorityRes = await request(
    'PATCH',
    `/api/v1/leads/${leadId}/priority`,
    { priority: 'Medium' },
    execToken
  );
  console.log('Change Priority Status:', priorityRes.status, 'New priority:', priorityRes.body.data.lead.priority);
  if (priorityRes.status !== 200 || priorityRes.body.data.lead.priority !== 'Medium') {
    throw new Error('Change priority failed');
  }

  // Isolation check: Executive 2 (Robin) attempts to view Executive 1 (Sam)'s assigned lead (expected 403)
  const exec2ViewFail = await request('GET', `/api/v1/leads/${leadId}`, null, exec2Token);
  console.log('Executive 2 viewing Executive 1 lead (expected 403):', exec2ViewFail.status);
  if (exec2ViewFail.status !== 403) throw new Error('Sales executive lead isolation failed');

  // Update lead status to Qualified
  const statusRes = await request(
    'PATCH',
    `/api/v1/leads/${leadId}/status`,
    { status: 'Qualified' },
    execToken
  );
  console.log('Change Status Status:', statusRes.status, 'New status:', statusRes.body.data.lead.status);

  // Convert Lead to Customer and Deal
  const convertRes = await request(
    'POST',
    `/api/v1/leads/${leadId}/convert`,
    {
      createDeal: true,
      dealName: 'Global Tech Enterprise License',
      dealValue: 65000,
      expectedClosingDate: '2026-11-30',
    },
    execToken
  );
  console.log('Convert Lead Status:', convertRes.status, convertRes.body.message);
  const customerId = convertRes.body.data.customer._id;
  const dealId = convertRes.body.data.deal._id;

  // Verify maintained references
  if (
    convertRes.body.data.customer.lead?.toString() !== leadId.toString() ||
    convertRes.body.data.deal.customer?.toString() !== customerId.toString() ||
    convertRes.body.data.deal.lead?.toString() !== leadId.toString()
  ) {
    throw new Error('Cross-entity references between Lead, Customer, and Deal are inconsistent!');
  }
  console.log('Cross-entity references verified: Lead <-> Customer <-> Deal linked cleanly');

  // Duplicate conversion attempt (expected 400)
  const duplicateConvertFail = await request(
    'POST',
    `/api/v1/leads/${leadId}/convert`,
    { createDeal: true },
    execToken
  );
  console.log('Duplicate conversion attempt (expected 400):', duplicateConvertFail.status);
  if (duplicateConvertFail.status !== 400) throw new Error('Duplicate conversion prevention failed');

  console.log('\n--- 5. Testing Deal Business Rules ---');
  // Rule: Updating to Lost requires lostReason
  const failLostRes = await request(
    'PATCH',
    `/api/v1/deals/${dealId}/stage`,
    { stage: 'Lost' },
    execToken
  );
  console.log('Deal marked Lost without reason (expected 400):', failLostRes.status, failLostRes.body.message);
  if (failLostRes.status !== 400) throw new Error('Deal business rule validation failed');

  // Move deal to Negotiation
  const stageUpdateRes = await request(
    'PATCH',
    `/api/v1/deals/${dealId}/stage`,
    { currentStage: 'Negotiation' },
    execToken
  );
  console.log(
    'Deal Stage Update to Negotiation:',
    stageUpdateRes.status,
    'Auto Probability:',
    stageUpdateRes.body.data.deal.probability + '%'
  );

  // Mark deal as Won
  const wonRes = await request(
    'PATCH',
    `/api/v1/deals/${dealId}/stage`,
    { currentStage: 'Won' },
    execToken
  );
  console.log('Deal Won Status:', wonRes.status, 'Stage:', wonRes.body.data.deal.currentStage);

  // Rule: A closed Won deal cannot freely move back to an active stage!
  const illegalReopenRes = await request(
    'PATCH',
    `/api/v1/deals/${dealId}/stage`,
    { currentStage: 'Proposal' },
    execToken
  );
  console.log(
    'Moving closed Won deal back to Proposal (expected 400):',
    illegalReopenRes.status,
    illegalReopenRes.body.message
  );
  if (illegalReopenRes.status !== 400) throw new Error('Closed deal reopen protection failed');

  console.log('\n--- 6. Testing Pipeline Summary ---');
  const pipelineRes = await request('GET', '/api/v1/deals/pipeline/summary', null, managerToken);
  console.log('Pipeline Summary Status:', pipelineRes.status, 'Summary:', pipelineRes.body.data.summary);

  console.log('\n--- 7. Testing Customer Management (Phase 6) ---');
  // Retrieve customer details and verify associated deals & original lead reference
  const custRes = await request('GET', `/api/v1/customers/${customerId}`, null, execToken);
  console.log('Customer Details Status:', custRes.status, 'Customer Name:', custRes.body.data.customer.name);
  if (custRes.status !== 200) throw new Error('Customer fetch failed');
  if (!custRes.body.data.customer.lead) throw new Error('Customer does not maintain original lead reference!');
  if (!Array.isArray(custRes.body.data.deals) || custRes.body.data.deals.length === 0) {
    throw new Error('Customer does not maintain associated deals!');
  }
  console.log('Customer maintained original lead and associated deals verified.');

  // Search, filtering, sorting, pagination, date filtering
  const custSearchRes = await request(
    'GET',
    '/api/v1/customers?search=Global&page=1&limit=5&sortBy=createdAt&sortOrder=desc',
    null,
    adminToken
  );
  console.log('Customer Search & Pagination Status:', custSearchRes.status, `Total: ${custSearchRes.body.meta.total}`);
  if (custSearchRes.status !== 200) throw new Error('Customer search/pagination failed');

  // Update customer
  const custUpdateRes = await request(
    'PUT',
    `/api/v1/customers/${customerId}`,
    { notes: 'Updated client notes for Q4 renewal.' },
    execToken
  );
  console.log('Update Customer Status:', custUpdateRes.status, 'Notes:', custUpdateRes.body.data.customer.notes);
  if (custUpdateRes.status !== 200) throw new Error('Customer update failed');

  // Access restrictions: Executive 2 (Robin) attempts to view Executive 1 (Sam)'s customer (expected 403)
  const exec2CustFail = await request('GET', `/api/v1/customers/${customerId}`, null, exec2Token);
  console.log('Executive 2 viewing Executive 1 customer (expected 403):', exec2CustFail.status);
  if (exec2CustFail.status !== 403) throw new Error('Customer access isolation failed');

  // Deletion protection: Attempting to delete customer with deals attached (expected 400)
  const deleteFailRes = await request('DELETE', `/api/v1/customers/${customerId}`, null, adminToken);
  console.log('Deleting customer with attached deals (expected 400):', deleteFailRes.status, deleteFailRes.body.message);
  if (deleteFailRes.status !== 400) throw new Error('Customer delete with deals protection failed');

  console.log('\n--- 8. Testing Activities and Follow-ups (Phase 8) ---');
  // 1. Create Demo activity on Customer
  const demoActivityRes = await request(
    'POST',
    `/api/v1/activities`,
    {
      type: 'Demo',
      title: 'Enterprise Architecture Demo',
      description: 'Discussing SSO and security architecture',
      status: 'Pending',
      priority: 'High',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      entityType: 'Customer',
      entityId: customerId,
    },
    execToken
  );
  console.log('Create Demo Activity Status:', demoActivityRes.status, demoActivityRes.body.message);
  if (demoActivityRes.status !== 201) throw new Error('Create Demo activity failed');
  const demoActivityId = demoActivityRes.body.data.activity._id;

  // 2. Create Call follow-up activity on Deal
  const callActivityRes = await request(
    'POST',
    `/api/v1/activities`,
    {
      type: 'Call',
      title: 'Pricing Negotiation Call',
      description: 'Review Q4 enterprise discount options',
      status: 'Pending',
      priority: 'Medium',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      entityType: 'Deal',
      entityId: dealId,
    },
    execToken
  );
  console.log('Create Call Activity Status:', callActivityRes.status);
  const callActivityId = callActivityRes.body.data.activity._id;

  // 3. Complete Activity with outcome & check completionDate
  const completeRes = await request(
    'PATCH',
    `/api/v1/activities/${demoActivityId}/status`,
    {
      status: 'Completed',
      outcome: 'Client approved SSO spec and requested security review document.',
    },
    execToken
  );
  console.log('Complete Activity Status:', completeRes.status, 'New status:', completeRes.body.data.activity.status);
  if (completeRes.status !== 200 || !completeRes.body.data.activity.completedDate) {
    throw new Error('Activity completion date tracking failed');
  }

  // 4. Overdue Activity Test: Create an activity with past due date
  const pastDueDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const overdueActivityRes = await request(
    'POST',
    `/api/v1/activities`,
    {
      type: 'Follow-up',
      title: 'Past Overdue Contract Check',
      description: 'Follow up on SLA signed copy',
      status: 'Pending',
      dueDate: pastDueDate,
      entityType: 'Deal',
      entityId: dealId,
    },
    execToken
  );
  console.log('Create Past Due Activity Status:', overdueActivityRes.status);
  const overdueActivityId = overdueActivityRes.body.data.activity._id;

  // Retrieve activities and verify dynamic Overdue evaluation
  const listActivitiesRes = await request(
    'GET',
    `/api/v1/activities?entityType=Deal&entityId=${dealId}`,
    null,
    execToken
  );
  const foundOverdue = listActivitiesRes.body.data.find((a) => a._id === overdueActivityId);
  console.log('Overdue activity dynamically evaluated:', foundOverdue?.status === 'Overdue' ? 'YES (Overdue)' : 'NO');
  if (foundOverdue?.status !== 'Overdue') {
    throw new Error('Dynamic overdue detection failed!');
  }

  // 5. Access restrictions: Executive 2 attempts to view Executive 1's activity (expected 403)
  const exec2ActivityFail = await request('GET', `/api/v1/activities/${callActivityId}`, null, exec2Token);
  console.log('Executive 2 viewing Executive 1 activity (expected 403):', exec2ActivityFail.status);
  if (exec2ActivityFail.status !== 403) throw new Error('Activity access isolation failed');

  console.log('\n--- 9. Testing Audit Timeline History (Phase 9) ---');
  // 1. Retrieve Lead timeline events
  const leadTimelineRes = await request('GET', `/api/v1/timeline/Lead/${leadId}`, null, execToken);
  console.log('Lead Timeline Events Count:', leadTimelineRes.body.data.length);
  if (leadTimelineRes.body.data.length < 3) throw new Error('Timeline audit trail missing lead events');
  const sampleLeadEvent = leadTimelineRes.body.data[0];
  console.log('Sample Lead Audit Entry:', {
    action: sampleLeadEvent.action,
    entityType: sampleLeadEvent.entityType,
    actor: sampleLeadEvent.performedBy?.name,
    timestamp: sampleLeadEvent.createdAt,
  });

  // 2. Retrieve Deal timeline events
  const dealTimelineRes = await request('GET', `/api/v1/timeline/Deal/${dealId}`, null, execToken);
  console.log('Deal Timeline Events Count:', dealTimelineRes.body.data.length);
  if (dealTimelineRes.body.data.length < 2) throw new Error('Timeline audit trail missing deal events');
  console.log('Latest Deal Action:', dealTimelineRes.body.data[0].action);

  // 3. Access restrictions: Executive 2 attempts to view Executive 1's lead audit trail (expected 403)
  const exec2TimelineFail = await request('GET', `/api/v1/timeline/Lead/${leadId}`, null, exec2Token);
  console.log('Executive 2 viewing Executive 1 timeline (expected 403):', exec2TimelineFail.status);
  if (exec2TimelineFail.status !== 403) throw new Error('Timeline audit isolation failed');

  // 4. Invalid entity type query check (expected 400)
  const invalidTypeFail = await request('GET', `/api/v1/timeline/Invoice/${dealId}`, null, adminToken);
  console.log('Query timeline with invalid entity type (expected 400):', invalidTypeFail.status);
  if (invalidTypeFail.status !== 400) throw new Error('Invalid entity type timeline check failed');

  // 5. Immutability check: Prohibit ordinary or malicious client alterations on audit log (expected 404)
  const illegalMutationRes = await request('POST', `/api/v1/timeline`, { action: 'Tampered' }, adminToken);
  console.log('Attempting to create/mutate audit records directly via API (expected 404):', illegalMutationRes.status);
  if (illegalMutationRes.status !== 404) throw new Error('Audit log immutability check failed');

  console.log('\n--- 10. Testing Dashboard & Team Performance Analytics (Phase 10) ---');
  // 1. Overall Dashboard/Analytics
  const dashRes = await request('GET', '/api/v1/dashboard', null, managerToken);
  console.log('Dashboard Metrics:', dashRes.body.data.metrics);
  if (dashRes.status !== 200 || !dashRes.body.data.metrics.conversionRate) {
    throw new Error('Dashboard metrics fetch failed');
  }

  // 2. Analytics Aliased Route & Granular Endpoints
  const analyticsRes = await request('GET', '/api/v1/analytics', null, managerToken);
  console.log('Analytics Master Status:', analyticsRes.status);
  if (analyticsRes.status !== 200) throw new Error('/api/v1/analytics route failed');

  const leadsAnalyticRes = await request('GET', '/api/v1/analytics/leads', null, managerToken);
  console.log('Lead Analytics:', leadsAnalyticRes.body.data);
  if (leadsAnalyticRes.status !== 200 || leadsAnalyticRes.body.data.totalLeads === undefined) {
    throw new Error('Leads analytics fetch failed');
  }

  const dealsAnalyticRes = await request('GET', '/api/v1/analytics/deals', null, managerToken);
  console.log('Deal Analytics (Revenue):', dealsAnalyticRes.body.data);
  if (dealsAnalyticRes.status !== 200 || dealsAnalyticRes.body.data.totalRevenue === undefined) {
    throw new Error('Deals analytics fetch failed');
  }

  const pipelineAnalyticRes = await request('GET', '/api/v1/analytics/pipeline', null, managerToken);
  console.log('Pipeline Stage Breakdown Stages:', pipelineAnalyticRes.body.data.length);
  if (pipelineAnalyticRes.status !== 200 || !Array.isArray(pipelineAnalyticRes.body.data)) {
    throw new Error('Pipeline breakdown analytics fetch failed');
  }

  const activityAnalyticRes = await request('GET', '/api/v1/analytics/activities', null, managerToken);
  console.log('Activity Analytics:', activityAnalyticRes.body.data);
  if (activityAnalyticRes.status !== 200 || activityAnalyticRes.body.data.pendingActivities === undefined) {
    throw new Error('Activity analytics fetch failed');
  }

  // 3. Manager & Admin Team Performance API
  const teamPerfRes = await request('GET', '/api/v1/analytics/team-performance', null, managerToken);
  console.log('Team Performance Count:', teamPerfRes.body.data.length, 'Status:', teamPerfRes.status);
  if (teamPerfRes.status !== 200 || !Array.isArray(teamPerfRes.body.data)) {
    throw new Error('Team performance fetch failed');
  }

  // 4. Role Scope Protection: Sales Executive unauthorized on team performance (expected 403)
  const execTeamPerfFail = await request('GET', '/api/v1/analytics/team-performance', null, execToken);
  console.log('Sales Executive accessing team performance (expected 403):', execTeamPerfFail.status);
  if (execTeamPerfFail.status !== 403) {
    throw new Error('Role authorization scope protection failed on team performance endpoint');
  }

  console.log('\n>>> ALL CRM ASSIGNMENT TEST SUITES PASSED FLAWLESSLY! <<<\n');
  server.close();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  if (server) server.close();
  process.exit(1);
});
