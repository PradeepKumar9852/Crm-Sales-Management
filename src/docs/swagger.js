/**
 * OpenAPI 3.0 Specification for CRM Sales Management System
 */
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'CRM Sales Management System API',
    version: '1.0.0',
    description:
      'A production-grade, enterprise B2B CRM RESTful backend API built with Node.js, Express, MongoDB (Mongoose), JWT, and Zod.',
    contact: {
      name: 'Backend Engineering Team',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base URL',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token obtained from /auth/login or /auth/register',
      },
    },
    schemas: {
      StandardSuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 10 },
              total: { type: 'integer', example: 45 },
              totalPages: { type: 'integer', example: 5 },
            },
          },
        },
      },
      StandardErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error description' },
          errors: {
            type: 'array',
            nullable: true,
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Please provide a valid email' },
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6735a123f890123456789abc' },
          name: { type: 'string', example: 'Sarah Sales Manager' },
          email: { type: 'string', example: 'manager@crm.local' },
          role: { type: 'string', enum: ['admin', 'sales_manager', 'sales_executive'], example: 'sales_manager' },
          department: { type: 'string', example: 'Enterprise Sales Ops' },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Lead: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6735a123f890123456789def' },
          name: { type: 'string', example: 'Acme Global Innovations' },
          email: { type: 'string', example: 'contact@acme.com' },
          phone: { type: 'string', example: '+1-555-0199' },
          company: { type: 'string', example: 'Acme Corp' },
          source: {
            type: 'string',
            enum: ['Website', 'Referral', 'Cold Outreach', 'LinkedIn', 'Campaign', 'Trade Show', 'Other'],
            example: 'Website',
          },
          status: {
            type: 'string',
            enum: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'],
            example: 'Qualified',
          },
          priority: { type: 'string', enum: ['Low', 'Medium', 'High'], example: 'High' },
          estimatedValue: { type: 'number', example: 75000 },
          isConverted: { type: 'boolean', example: false },
          assignedTo: { $ref: '#/components/schemas/User' },
          createdBy: { $ref: '#/components/schemas/User' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Customer: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6735a123f890123456789cde' },
          name: { type: 'string', example: 'Acme Global Innovations' },
          email: { type: 'string', example: 'contact@acme.com' },
          phone: { type: 'string', example: '+1-555-0199' },
          company: { type: 'string', example: 'Acme Corp' },
          lead: { type: 'string', example: '6735a123f890123456789def' },
          assignedTo: { $ref: '#/components/schemas/User' },
          status: { type: 'string', enum: ['Active', 'Inactive'], example: 'Active' },
          notes: { type: 'string', example: 'Key enterprise account' },
        },
      },
      Deal: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6735a123f890123456789fab' },
          dealName: { type: 'string', example: 'Acme Software License 2026' },
          dealValue: { type: 'number', example: 75000 },
          currency: { type: 'string', example: 'USD' },
          currentStage: {
            type: 'string',
            enum: ['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'],
            example: 'Negotiation',
          },
          probability: { type: 'number', example: 80 },
          expectedRevenue: { type: 'number', example: 60000 },
          expectedClosingDate: { type: 'string', format: 'date-time' },
          lostReason: { type: 'string', example: 'Competitor pricing lower' },
          customer: { type: 'string', example: '6735a123f890123456789cde' },
          lead: { type: 'string', example: '6735a123f890123456789def' },
          assignedTo: { $ref: '#/components/schemas/User' },
        },
      },
      Activity: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6735a123f890123456789bbb' },
          type: {
            type: 'string',
            enum: ['Call', 'Email', 'Meeting', 'Demo', 'Follow-up', 'Reminder', 'Note'],
            example: 'Demo',
          },
          title: { type: 'string', example: 'Product Architecture Review' },
          status: { type: 'string', enum: ['Pending', 'Completed', 'Cancelled', 'Overdue'], example: 'Pending' },
          priority: { type: 'string', enum: ['Low', 'Medium', 'High'], example: 'High' },
          dueDate: { type: 'string', format: 'date-time' },
          isOverdue: { type: 'boolean', example: false },
          entityType: { type: 'string', enum: ['Lead', 'Customer', 'Deal'], example: 'Lead' },
          entityId: { type: 'string', example: '6735a123f890123456789def' },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'System health check',
        tags: ['System'],
        security: [],
        responses: {
          200: { description: 'System is healthy' },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register a new user account',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Sam Executive' },
                  email: { type: 'string', example: 'sam@crm.local' },
                  password: { type: 'string', example: 'Password123!' },
                  role: { type: 'string', enum: ['admin', 'sales_manager', 'sales_executive'], example: 'sales_executive' },
                  department: { type: 'string', example: 'Outbound Sales' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Validation failed' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Log in with email & password',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@crm.local' },
                  password: { type: 'string', example: 'Admin@123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful (Returns JWT token)' },
          401: { description: 'Invalid credentials' },
          403: { description: 'User account deactivated' },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Log out current user (Blacklists JWT)',
        tags: ['Authentication'],
        responses: {
          200: { description: 'Logged out successfully' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current user profile',
        tags: ['Authentication'],
        responses: {
          200: { description: 'Profile retrieved successfully' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/auth/update-profile': {
      put: {
        summary: 'Update own profile details',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Sam Updated' },
                  phone: { type: 'string', example: '+1-555-0188' },
                  department: { type: 'string', example: 'Enterprise Inside Sales' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Profile updated successfully' },
        },
      },
    },
    '/auth/update-password': {
      put: {
        summary: 'Change account password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', example: 'Admin@123' },
                  newPassword: { type: 'string', example: 'NewSecurePassword123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password updated successfully' },
          401: { description: 'Current password incorrect' },
        },
      },
    },
    '/users': {
      get: {
        summary: 'List all company users (Manager/Admin only)',
        tags: ['User Management'],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name or email' },
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['admin', 'sales_manager', 'sales_executive'] } },
          { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'Users retrieved successfully' },
          403: { description: 'Forbidden: Insufficient role' },
        },
      },
      post: {
        summary: 'Create a new user (Admin only)',
        tags: ['User Management'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'role'],
                properties: {
                  name: { type: 'string', example: 'New Rep' },
                  email: { type: 'string', example: 'newrep@crm.local' },
                  password: { type: 'string', example: 'Password123!' },
                  role: { type: 'string', enum: ['admin', 'sales_manager', 'sales_executive'], example: 'sales_executive' },
                  department: { type: 'string', example: 'Outbound Sales' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User created successfully' },
          403: { description: 'Forbidden: Admin only' },
        },
      },
    },
    '/users/sales-reps': {
      get: {
        summary: 'List active sales executives for assignment',
        tags: ['User Management'],
        responses: {
          200: { description: 'Sales representatives list' },
        },
      },
    },
    '/users/{id}': {
      get: {
        summary: 'Get user details by ID (Manager/Admin)',
        tags: ['User Management'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'User details' },
          404: { description: 'User not found' },
        },
      },
      put: {
        summary: 'Update user profile/role (Admin only)',
        tags: ['User Management'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['admin', 'sales_manager', 'sales_executive'] },
                  department: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User updated' },
        },
      },
      delete: {
        summary: 'Permanently delete user (Admin only)',
        tags: ['User Management'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'User deleted' },
        },
      },
    },
    '/users/{id}/status': {
      patch: {
        summary: 'Activate or deactivate user account (Admin only)',
        tags: ['User Management'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isActive'],
                properties: {
                  isActive: { type: 'boolean', example: false },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User status updated' },
        },
      },
    },
    '/leads': {
      get: {
        summary: 'List leads with filtering, search, and pagination',
        tags: ['Lead Management'],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search name, company, email' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['Low', 'Medium', 'High'] } },
          { name: 'source', in: 'query', schema: { type: 'string' } },
          { name: 'assignedTo', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'Leads list with pagination' },
        },
      },
      post: {
        summary: 'Create a new lead',
        tags: ['Lead Management'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'Acme Innovations' },
                  email: { type: 'string', example: 'contact@acme.com' },
                  phone: { type: 'string', example: '+1-555-0123' },
                  company: { type: 'string', example: 'Acme Corp' },
                  source: { type: 'string', default: 'Website', example: 'Website' },
                  priority: { type: 'string', enum: ['Low', 'Medium', 'High'], default: 'Medium' },
                  estimatedValue: { type: 'number', example: 50000 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Lead created successfully' },
        },
      },
    },
    '/leads/{id}': {
      get: {
        summary: 'Get lead details by ID',
        tags: ['Lead Management'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Lead details' },
          403: { description: 'Forbidden: Record belongs to another executive' },
          404: { description: 'Lead not found' },
        },
      },
      put: {
        summary: 'Update lead details',
        tags: ['Lead Management'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  company: { type: 'string' },
                  estimatedValue: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Lead updated' },
        },
      },
      delete: {
        summary: 'Delete lead',
        tags: ['Lead Management'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Lead deleted' },
        },
      },
    },
    '/leads/{id}/status': {
      patch: {
        summary: 'Change lead status',
        tags: ['Lead Management'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'],
                    example: 'Qualified',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated' },
        },
      },
    },
    '/leads/{id}/priority': {
      patch: {
        summary: 'Change lead priority',
        tags: ['Lead Management'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['priority'],
                properties: {
                  priority: { type: 'string', enum: ['Low', 'Medium', 'High'], example: 'High' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Priority updated' },
        },
      },
    },
    '/leads/{id}/assign': {
      patch: {
        summary: 'Assign or reassign lead to active sales executive (Manager/Admin)',
        tags: ['Lead Management'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['assignedTo'],
                properties: {
                  assignedTo: { type: 'string', example: '6735a123f890123456789abc' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Lead assigned' },
          400: { description: 'Assignee is inactive or invalid' },
          403: { description: 'Manager/Admin only' },
        },
      },
    },
    '/leads/{id}/convert': {
      post: {
        summary: 'Convert qualified lead to Customer and Deal',
        tags: ['Lead Management'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  createDeal: { type: 'boolean', default: true },
                  dealName: { type: 'string', example: 'Enterprise Contract 2026' },
                  dealValue: { type: 'number', example: 65000 },
                  expectedClosingDate: { type: 'string', format: 'date', example: '2026-12-31' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Lead converted successfully' },
          400: { description: 'Lead not qualified or already converted' },
        },
      },
    },
    '/customers': {
      get: {
        summary: 'List customers with search and pagination',
        tags: ['Customer Management'],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'Customers list' },
        },
      },
      post: {
        summary: 'Create a new customer profile directly',
        tags: ['Customer Management'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                  name: { type: 'string', example: 'Global Client LLC' },
                  email: { type: 'string', example: 'client@global.com' },
                  company: { type: 'string', example: 'Global Client' },
                  phone: { type: 'string', example: '+1-555-0188' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Customer created' },
        },
      },
    },
    '/customers/{id}': {
      get: {
        summary: 'Get customer profile (includes linked deals, activities, and lead ref)',
        tags: ['Customer Management'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Customer details' },
          403: { description: 'Forbidden' },
          404: { description: 'Not found' },
        },
      },
      put: {
        summary: 'Update customer information',
        tags: ['Customer Management'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  phone: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Customer updated' },
        },
      },
      delete: {
        summary: 'Delete customer (Blocked if active deals attached)',
        tags: ['Customer Management'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Customer deleted' },
          400: { description: 'Cannot delete: active deals attached' },
        },
      },
    },
    '/deals': {
      get: {
        summary: 'List deals with stage filters and pagination',
        tags: ['Deal Pipeline'],
        parameters: [
          { name: 'currentStage', in: 'query', schema: { type: 'string', enum: ['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'Deals list' },
        },
      },
      post: {
        summary: 'Create a new pipeline deal',
        tags: ['Deal Pipeline'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['dealName', 'dealValue', 'expectedClosingDate'],
                properties: {
                  dealName: { type: 'string', example: 'Q4 Enterprise License' },
                  dealValue: { type: 'number', example: 50000 },
                  currentStage: { type: 'string', enum: ['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'], default: 'Qualification' },
                  expectedClosingDate: { type: 'string', format: 'date', example: '2026-11-30' },
                  customer: { type: 'string', example: '6735a123f890123456789cde' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Deal created' },
        },
      },
    },
    '/deals/pipeline/summary': {
      get: {
        summary: 'Get deals count & total value across all 6 stages',
        tags: ['Deal Pipeline'],
        responses: {
          200: { description: 'Pipeline summary' },
        },
      },
    },
    '/deals/{id}': {
      get: {
        summary: 'Get deal details by ID',
        tags: ['Deal Pipeline'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Deal details' },
        },
      },
      put: {
        summary: 'Update deal details',
        tags: ['Deal Pipeline'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  dealName: { type: 'string' },
                  dealValue: { type: 'number' },
                  expectedClosingDate: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Deal updated' },
        },
      },
      delete: {
        summary: 'Delete deal',
        tags: ['Deal Pipeline'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Deal deleted' },
        },
      },
    },
    '/deals/{id}/stage': {
      patch: {
        summary: 'Update deal stage (Enforces lostReason and closed immutability)',
        tags: ['Deal Pipeline'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentStage'],
                properties: {
                  currentStage: {
                    type: 'string',
                    enum: ['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'],
                    example: 'Negotiation',
                  },
                  probability: { type: 'number', example: 80 },
                  lostReason: { type: 'string', example: 'Competitor undercut price by 25%' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Deal stage updated' },
          400: { description: 'Lost reason missing or closed deal reopen attempt' },
        },
      },
    },
    '/activities': {
      get: {
        summary: 'List activities (Filter by status, priority, dueDate, entityType)',
        tags: ['Activities & Follow-ups'],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['Pending', 'Completed', 'Cancelled', 'Overdue'] } },
          { name: 'entityType', in: 'query', schema: { type: 'string', enum: ['Lead', 'Customer', 'Deal'] } },
          { name: 'entityId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Activities list' },
        },
      },
      post: {
        summary: 'Log an activity / follow-up',
        tags: ['Activities & Follow-ups'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'title', 'dueDate', 'entityType', 'entityId'],
                properties: {
                  type: { type: 'string', enum: ['Call', 'Email', 'Meeting', 'Demo', 'Follow-up', 'Reminder', 'Note'], example: 'Demo' },
                  title: { type: 'string', example: 'Product Architecture Review' },
                  dueDate: { type: 'string', format: 'date-time', example: '2026-10-20T10:00:00Z' },
                  priority: { type: 'string', enum: ['Low', 'Medium', 'High'], default: 'Medium' },
                  entityType: { type: 'string', enum: ['Lead', 'Customer', 'Deal'], example: 'Deal' },
                  entityId: { type: 'string', example: '6735a123f890123456789fab' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Activity created' },
        },
      },
    },
    '/activities/{id}': {
      get: {
        summary: 'Get activity details',
        tags: ['Activities & Follow-ups'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Activity details' },
        },
      },
      put: {
        summary: 'Update activity details',
        tags: ['Activities & Follow-ups'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  dueDate: { type: 'string', format: 'date-time' },
                  priority: { type: 'string', enum: ['Low', 'Medium', 'High'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Activity updated' },
        },
      },
      delete: {
        summary: 'Delete activity',
        tags: ['Activities & Follow-ups'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Activity deleted' },
        },
      },
    },
    '/activities/{id}/status': {
      patch: {
        summary: 'Mark activity as Completed with outcome',
        tags: ['Activities & Follow-ups'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['Completed', 'Cancelled'], example: 'Completed' },
                  outcome: { type: 'string', example: 'Client approved solution design' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Activity marked completed' },
        },
      },
    },
    '/timeline/{entityType}/{entityId}': {
      get: {
        summary: 'Get chronological audit trail for a Lead, Customer, or Deal',
        tags: ['Audit Timeline'],
        parameters: [
          { name: 'entityType', in: 'path', required: true, schema: { type: 'string', enum: ['Lead', 'Customer', 'Deal'] } },
          { name: 'entityId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Audit history list' },
        },
      },
    },
    '/analytics': {
      get: {
        summary: 'Complete executive sales dashboard & pipeline breakdown',
        tags: ['Analytics & Reports'],
        responses: {
          200: { description: 'Master KPI metrics & pipeline' },
        },
      },
    },
    '/analytics/leads': {
      get: {
        summary: 'Total, new, qualified, converted leads & conversion rate %',
        tags: ['Analytics & Reports'],
        responses: {
          200: { description: 'Lead analytics' },
        },
      },
    },
    '/analytics/deals': {
      get: {
        summary: 'Total, open, won, lost deals & won revenue financials',
        tags: ['Analytics & Reports'],
        responses: {
          200: { description: 'Deal financials' },
        },
      },
    },
    '/analytics/pipeline': {
      get: {
        summary: 'Deals count and total value breakdown across all 6 stages',
        tags: ['Analytics & Reports'],
        responses: {
          200: { description: 'Pipeline stage breakdown' },
        },
      },
    },
    '/analytics/activities': {
      get: {
        summary: 'Pending, overdue, and completed activity counts',
        tags: ['Analytics & Reports'],
        responses: {
          200: { description: 'Activity analytics' },
        },
      },
    },
    '/analytics/team-performance': {
      get: {
        summary: 'Sales executive team performance metrics (Manager/Admin only)',
        tags: ['Analytics & Reports'],
        responses: {
          200: { description: 'Team performance array' },
          403: { description: 'Forbidden: Manager/Admin only' },
        },
      },
    },
  },
};

module.exports = swaggerSpec;
