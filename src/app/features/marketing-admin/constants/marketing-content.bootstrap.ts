/** Default CMS payload (from EkklesiaNexusWeb marketing-content.export.json). Bundled so Save draft does not depend on static /assets. */
export const MARKETING_CONTENT_BOOTSTRAP: Record<string, unknown> = {
  "site": {
    "name": "EkklesiaNexus",
    "tagline": "One connected church. Complete 360° management.",
    "slogan": "The Next Generation of Church Management System.",
    "supportingLine": "One connected church. Complete 360° management.",
    "seoTitle": "The Next Generation of Church Management System — EkklesiaNexus",
    "seoDescription": "Simplify parish administration with EkklesiaNexus, an integrated church management platform designed for Catholic parishes. Manage families, members, sacramental registers, Mass intentions, ministries, and church finances in one connected system—streamlining daily operations and helping your parish community stay connected."
  },
  "navigation": [
    {
      "label": "Home",
      "href": "#home"
    },
    {
      "label": "Solutions",
      "href": "#solutions"
    },
    {
      "label": "Product",
      "href": "#product"
    },
    {
      "label": "Benefits",
      "href": "#benefits"
    },
    {
      "label": "Contact",
      "href": "#contact"
    }
  ],
  "hero": {
    "title": "The Next Generation of Church Management System.",
    "supportingLine": "One connected church. Complete 360° management.",
    "description": "Simplify parish administration with EkklesiaNexus, an integrated church management platform designed for Catholic parishes. Manage families, members, sacramental registers, Mass intentions, ministries, and church finances in one connected system—streamlining daily operations and helping your parish community stay connected.",
    "image": "/images/product/dashboard.png",
    "imageAlt": "EkklesiaNexus parish dashboard showing connected parish overview",
    "ctas": [
      {
        "label": "Request a Demo",
        "href": "#contact",
        "variant": "primary"
      },
      {
        "label": "Explore the Platform",
        "href": "#product",
        "variant": "secondary"
      },
      {
        "label": "Talk to Our Team",
        "href": "#contact",
        "variant": "ghost"
      }
    ]
  },
  "valueStrip": [
    {
      "id": "connected",
      "title": "One Connected Church",
      "description": "Keep parish people, pastoral records, stewardship, and administration in one connected management experience."
    },
    {
      "id": "360",
      "title": "Complete 360° Management",
      "description": "See families, sacraments, ministries, projects, and reports together instead of scattered registers."
    },
    {
      "id": "purpose",
      "title": "Built for Parish Life",
      "description": "Designed for how parishes actually work—collection days, sacramental seasons, leadership review, and everyday office administration."
    },
    {
      "id": "stewardship",
      "title": "Connected Stewardship",
      "description": "Organize donations, contribution plans, dues, projects, and campaigns with clarity for treasurers and administrators."
    }
  ],
  "why": {
    "title": "Why EkklesiaNexus",
    "paragraphs": [
      "Parish administration often spreads across registers, spreadsheets, and memory. Families, sacraments, stewardship, ministries, and worship each carry important information—but when those records live in disconnected places, follow-up slows and leadership lacks a clear picture.",
      "EkklesiaNexus is built to connect what matters: households and members, pastoral records, stewardship, parish communities, Mass, projects, campaigns, and reports—in one experience designed for church life.",
      "The result is calmer everyday administration, better visibility for leadership, and a parish team that can focus on people instead of reconstructing data."
    ]
  },
  "church360": {
    "title": "Complete 360° Church Management",
    "subtitle": "Everything important to your church, connected in one experience.",
    "areas": [
      "Families",
      "Members",
      "Sacraments",
      "Stewardship",
      "Ministries",
      "Life Groups / BCCs",
      "Leadership",
      "Mass",
      "Reports",
      "Administration"
    ]
  },
  "featureCategories": [
    {
      "id": "people",
      "title": "People & Community",
      "items": [
        {
          "id": "families",
          "categoryId": "people",
          "title": "Families",
          "description": "Families is your centralized register of parish households, bringing together members, contact details, community relationships, and relevant stewardship context. Administrators can maintain family information in one organized place, making it easier to keep parish records current and provide better pastoral support."
        },
        {
          "id": "members",
          "categoryId": "people",
          "title": "Members",
          "description": "Member profiles connect individuals to families, sacraments, ministries, and stewardship information your parish already maintains. Secretaries and administrators can find the right context quickly during office visits and phone calls without searching separate lists."
        },
        {
          "id": "ministries",
          "categoryId": "people",
          "title": "Ministries & Associations",
          "description": "Organize ministries, associations, councils, and parish organizations with membership, leadership terms, and history. Pastors and coordinators gain a clearer picture of who serves and how each group fits parish life."
        },
        {
          "id": "bcc",
          "categoryId": "people",
          "title": "Life Groups / Basic Christian Communities (BCCs)",
          "description": "Life Groups are managed as Basic Christian Communities (BCCs)—small faith communities within the parish roll. Assign families, see leadership, and keep neighborhood-level community life visible alongside families and members."
        },
        {
          "id": "leadership",
          "categoryId": "people",
          "title": "Parish Leadership",
          "description": "Parish leadership records help you know who serves now, who served before, and how appointments change across clergy, staff, ministries, and associations. Continuity becomes easier when leadership information lives in one organized place."
        }
      ]
    },
    {
      "id": "pastoral",
      "title": "Pastoral & Sacramental",
      "items": [
        {
          "id": "sacraments",
          "categoryId": "pastoral",
          "title": "Sacraments",
          "description": "Sacramental records are among the most valuable registers a parish maintains. EkklesiaNexus helps you organize baptisms, confirmations, marriages, and other sacramental entries with search, detail views, and certificates where your parish workflow supports them."
        },
        {
          "id": "certificates",
          "categoryId": "pastoral",
          "title": "Certificates & Verification",
          "description": "Generate and manage sacramental certificates where supported, and use public certificate verification when your parish enables it. Families receive trustworthy documentation while administrators keep production aligned with parish records."
        },
        {
          "id": "mass",
          "categoryId": "pastoral",
          "title": "Mass & Mass Intentions",
          "description": "Coordinate Mass schedules, intentions, and related worship administration. Sacristans and administrators can review upcoming celebrations and intention activity with records that stay connected to parish worship life."
        }
      ]
    },
    {
      "id": "stewardship",
      "title": "Stewardship",
      "items": [
        {
          "id": "donations",
          "categoryId": "stewardship",
          "title": "Donations & Contributions",
          "description": "Record collections, issue receipts, and review contribution activity in a workspace built for parish stewardship. Treasurers can answer family questions and prepare council summaries from organized records instead of scattered notebooks."
        },
        {
          "id": "plans",
          "categoryId": "stewardship",
          "title": "Contribution Plans & Dues",
          "description": "Contribution plans and outstanding dues help parishes follow up with clarity. See what is pledged, what is received, and what still needs attention—supporting calm stewardship conversations with families."
        },
        {
          "id": "projects",
          "categoryId": "stewardship",
          "title": "Projects, Installments & Campaigns",
          "description": "Dedicated projects and campaigns keep special fundraising organized with progress visibility. Installments honor families who give over time while leadership reviews remaining commitments together."
        }
      ]
    },
    {
      "id": "admin",
      "title": "Administration",
      "items": [
        {
          "id": "dashboard",
          "categoryId": "admin",
          "title": "Dashboard",
          "description": "The parish dashboard offers a connected starting point for administrators—highlighting celebrations, stewardship health, Mass intentions, and operational items that deserve attention today. Leaders open one screen instead of jumping between registers when the office day begins."
        },
        {
          "id": "users",
          "categoryId": "admin",
          "title": "Users, Roles & Permissions",
          "description": "Mirror real parish responsibilities with custom roles so sacristans, secretaries, and stewardship volunteers see what they need—without opening sensitive areas unnecessarily. Permissions stay aligned with how your parish already divides pastoral, financial, and administrative work."
        },
        {
          "id": "church-profile",
          "categoryId": "admin",
          "title": "Church Settings & Profile",
          "description": "Maintain parish identity—name, contact, logo, leadership, and settings—so EkklesiaNexus reflects the church your community knows and trusts. Updates in Church Profile flow through the experience your staff and volunteers use every day."
        }
      ]
    },
    {
      "id": "insights",
      "title": "Insights",
      "items": [
        {
          "id": "reports",
          "categoryId": "insights",
          "title": "Reports & Dashboards",
          "description": "Turn records you already maintain into organized reports and dashboards for monthly review, stewardship follow-up, and leadership meetings—without assembling figures from separate registers by hand. Reports draw from the same tenant-scoped data your parish already stewards in EkklesiaNexus."
        },
        {
          "id": "exports",
          "categoryId": "insights",
          "title": "Supported Exports",
          "description": "Where your parish role includes data export, authorized administrators can produce portable archives aligned with parish governance—keeping information accessible for planning and continuity. Exports respect the permissions your parish assigns; they are not a back door around tenant isolation."
        }
      ]
    }
  ],
  "solutions": [
    {
      "id": "families-members",
      "title": "Families & Members",
      "description": "EkklesiaNexus helps parishes maintain a connected view of households and individual members—relationships, sacramental links, ministries, and stewardship context in one organized experience.",
      "bullets": [
        "Centralized family and member registers",
        "Household relationships and parish roll visibility",
        "Faster answers during office visits and pastoral follow-up"
      ]
    },
    {
      "id": "sacraments",
      "title": "Sacraments",
      "description": "Preserve sacramental history with organized records, search, certificates where supported, and verification workflows your parish enables—so valuable pastoral information stays accessible for generations.",
      "bullets": [
        "Sacramental record maintenance and search",
        "Certificate generation where implemented",
        "Public certificate verification where enabled"
      ]
    },
    {
      "id": "stewardship",
      "title": "Stewardship",
      "description": "Bring donations, contribution plans, dues, projects, installments, and campaigns into one stewardship workspace designed for treasurers, secretaries, and parish leadership review.",
      "bullets": [
        "Collections, receipts, and outstanding balances",
        "Contribution plans and dues follow-up",
        "Projects, installments, and campaign progress"
      ]
    },
    {
      "id": "ministries-bcc",
      "title": "Ministries & Life Groups / BCCs",
      "description": "Organize ministries, associations, and Basic Christian Communities (BCCs) with membership and leadership information—so parish community life stays visible and coordinated.",
      "bullets": [
        "Ministries and associations as organizations",
        "Life Groups implemented as BCCs in the product",
        "Leadership terms and participation context"
      ]
    },
    {
      "id": "leadership",
      "title": "Parish Leadership",
      "description": "Church Profile and leadership records give administrators a clearer organizational picture—clergy, key staff, and ministry office-bearers in one connected parish story.",
      "bullets": [
        "Church Profile and leadership visibility",
        "Organizational roles across ministries",
        "Continuity when volunteers rotate"
      ]
    },
    {
      "id": "mass",
      "title": "Mass & Mass Intentions",
      "description": "Manage Mass schedules, intentions, and related worship records with workflows that support sacristans and parish administrators through the liturgical week.",
      "bullets": [
        "Mass schedules and celebrations",
        "Mass intentions management",
        "Reporting where supported in your parish setup"
      ]
    }
  ],
  "reports": {
    "title": "See Your Parish More Clearly.",
    "purpose": "Organized parish information becomes practical visibility for review, planning, follow-up, and leadership decision-making. Instead of gathering summaries from separate registers, administrators can open reports and dashboards built from the same records the parish maintains every day.",
    "whatItTellsYou": [
      "Contribution activity, receipts, and stewardship patterns for a selected period",
      "Outstanding and upcoming contribution amounts that need follow-up",
      "Project and campaign progress toward dedicated parish goals",
      "Mass intention activity and worship-related summaries where supported",
      "Family and member dashboards that help you understand parish composition and change"
    ],
    "whenToUse": [
      "Monthly parish and finance council review",
      "Stewardship follow-up after collection days",
      "Project or building committee check-ins",
      "Campaign monitoring during special appeals",
      "Leadership meetings that need a shared picture of parish life"
    ],
    "howToUseSteps": [
      "Open the relevant report or dashboard",
      "Select the period or filters your review requires",
      "Review the information together with leadership or staff",
      "Identify areas that need gratitude, follow-up, or pastoral attention",
      "Export or download where your role and parish policy support it"
    ],
    "whatYouCanDo": [
      "Review organized parish information in one place",
      "Filter by period and relevant stewardship or activity views",
      "Inspect contribution activity and outstanding or upcoming amounts",
      "Review project and campaign information alongside stewardship",
      "Export data where authorized exports are enabled for your parish"
    ],
    "whyThisHelps": "Reports reduce dependence on scattered notebooks and ad hoc spreadsheets. They support better visibility, calmer follow-up, clearer leadership discussions, and more confident administrative decisions—because the figures come from records your team already maintains.",
    "practicalAdvantages": "Instead of assembling information from separate registers, spreadsheets, and individual records, administrators can use organized reports to review relevant information together and focus attention on areas that require follow-up.",
    "administratorUse": "A parish secretary might open stewardship reports before calling families about outstanding dues. A treasurer might review collections and project progress before finance council. Pastors and administrators might scan dashboards to prepare for leadership conversations—always from the same connected parish data.",
    "benefits": [
      "Better visibility across stewardship and parish activity",
      "Easier follow-up on contributions, projects, and campaigns",
      "Clearer accountability for receipts and administrative review",
      "More informed leadership discussions without manual reconstruction"
    ]
  },
  "workflow": {
    "title": "A Connected Parish Administration Flow",
    "steps": [
      {
        "id": "1",
        "label": "Review Dashboard"
      },
      {
        "id": "2",
        "label": "Manage Families & Members"
      },
      {
        "id": "3",
        "label": "Maintain Pastoral Records"
      },
      {
        "id": "4",
        "label": "Manage Stewardship"
      },
      {
        "id": "5",
        "label": "Coordinate Parish Communities"
      },
      {
        "id": "6",
        "label": "Review Projects & Campaigns"
      },
      {
        "id": "7",
        "label": "Review Reports & Insights"
      }
    ]
  },
  "advantages": [
    {
      "id": "one-connected",
      "title": "One Connected Church",
      "description": "Important parish information—people, pastoral records, stewardship, ministries, and administration—can live in one connected management experience. Your team spends less time reconciling separate lists and more time serving families."
    },
    {
      "id": "visibility",
      "title": "Complete 360° Visibility",
      "description": "Leadership and administrators can see key areas of parish operations together. Dashboards and reports help you understand what is happening across families, sacraments, stewardship, worship, and community life."
    },
    {
      "id": "families",
      "title": "Better Family & Member Management",
      "description": "Organized household and member records make everyday office work calmer. Updates to contact details, relationships, and parish context stay connected to the families you serve."
    },
    {
      "id": "sacraments",
      "title": "Organized Sacramental Records",
      "description": "Sacramental registers deserve careful preservation. EkklesiaNexus helps parishes maintain, search, and retrieve sacramental information—and produce certificates where your workflow supports them."
    },
    {
      "id": "stewardship",
      "title": "Smarter Stewardship Management",
      "description": "Donations, contribution plans, dues, projects, and campaigns become easier to organize and review. Treasurers and administrators gain clearer paths for follow-up and leadership reporting."
    },
    {
      "id": "leadership",
      "title": "Better Parish Leadership",
      "description": "When leadership information is organized in Church Profile and ministries, pastors and administrators can prepare for meetings with a clearer picture of who serves and who leads across the parish. Transitions and appointments are easier to track when history lives beside current assignments."
    },
    {
      "id": "ministries",
      "title": "Stronger Ministry Coordination",
      "description": "Ministries, associations, and Life Groups / BCCs stay visible with membership and leadership context. Coordinators spend less time hunting for names across disconnected lists."
    },
    {
      "id": "admin",
      "title": "Easier Everyday Administration",
      "description": "Common parish office tasks—updates, lookups, receipts, and reviews—become more organized when modules share the same foundation. Volunteers can be given focused access through roles and permissions."
    },
    {
      "id": "access",
      "title": "Better Information Access",
      "description": "Authorized users can find relevant parish information faster during visits, phone calls, and council preparation—without opening every module to assemble a simple answer. Families, sacraments, and stewardship context stay linked so answers feel complete, not fragmented."
    },
    {
      "id": "decisions",
      "title": "Better Decision-Making",
      "description": "Accurate, organized information supports informed administrative and leadership decisions. Reports and dashboards help conversations start from facts the parish already maintains."
    },
    {
      "id": "history",
      "title": "Preserving Parish History",
      "description": "Family, sacramental, leadership, and stewardship records form the parish memory. EkklesiaNexus helps you keep that journey organized and accessible for the long term."
    }
  ],
  "audiences": [
    {
      "id": "priests",
      "title": "Parish Priests",
      "description": "Gain a connected view of parish life—people, worship, stewardship, and pastoral follow-up—without assembling updates from separate notebooks before every meeting."
    },
    {
      "id": "administrators",
      "title": "Church Administrators",
      "description": "Run the parish office with organized families, sacraments, stewardship, and reports in one system designed for everyday parish administration."
    },
    {
      "id": "secretaries",
      "title": "Parish Secretaries",
      "description": "Answer family questions faster, maintain current records, and support sacramental and administrative workflows with information that stays connected."
    },
    {
      "id": "leadership",
      "title": "Parish Leadership",
      "description": "Review stewardship, projects, campaigns, and parish activity with reports and dashboards that support council and leadership conversations."
    },
    {
      "id": "teams",
      "title": "Church Management Teams",
      "description": "Coordinate treasurers, sacristans, and ministry coordinators with focused roles—so each volunteer sees what they need without unnecessary complexity."
    },
    {
      "id": "diocesan",
      "title": "Diocesan Decision-Makers",
      "description": "Evaluate a modern parish management platform built for complete church operations—families through stewardship, worship, and insights—when supporting parishes in digital administration."
    }
  ],
  "finalCta": {
    "title": "Ready to see EkklesiaNexus in action?",
    "description": "Request a demo and explore how your parish can manage families, sacraments, stewardship, ministries, worship, and reports in one connected Church Management System.",
    "ctas": [
      {
        "label": "Request a Demo",
        "href": "#contact",
        "variant": "primary"
      },
      {
        "label": "Explore the Platform",
        "href": "#product",
        "variant": "secondary"
      }
    ]
  },
  "screenshots": [
    {
      "id": "dashboard",
      "title": "Dashboard",
      "module": "Dashboard",
      "description": "Start the day with a calm overview of parish activity—celebrations, stewardship, Mass intentions, and items that need follow-up.",
      "image": "/images/product/dashboard.png",
      "alt": "EkklesiaNexus executive dashboard overview",
      "capabilities": [
        "Morning briefing",
        "Leadership visibility",
        "Paths to go deeper"
      ],
      "benefit": "Spend less time opening module after module to understand what is happening in the parish.",
      "displayOrder": 1,
      "active": true
    },
    {
      "id": "families",
      "title": "Families",
      "module": "Families",
      "description": "Maintain parish households with members, relationships, and relevant pastoral and stewardship context in one place.",
      "image": "/images/product/families.png",
      "alt": "EkklesiaNexus families list and parish households",
      "capabilities": [
        "Household records",
        "Member connections",
        "Parish roll visibility"
      ],
      "benefit": "Keep family information current for pastoral support and everyday administration.",
      "displayOrder": 2,
      "active": true
    },
    {
      "id": "sacraments",
      "title": "Sacraments",
      "module": "Sacraments",
      "description": "Preserve and access sacramental records—among the most valuable registers a parish maintains.",
      "image": "/images/product/sacraments.png",
      "alt": "EkklesiaNexus sacramental records list",
      "capabilities": [
        "Record maintenance",
        "Search and retrieval",
        "Certificates where supported"
      ],
      "benefit": "Protect parish history and respond faster when families need sacramental information.",
      "displayOrder": 3,
      "active": true
    },
    {
      "id": "donations",
      "title": "Stewardship & Donations",
      "module": "Donations",
      "description": "Organize collections, receipts, outstanding balances, plans, and leadership overview in one stewardship workspace.",
      "image": "/images/product/donations.png",
      "alt": "EkklesiaNexus stewardship and donations overview",
      "capabilities": [
        "Collections",
        "Contribution plans",
        "Outstanding follow-up"
      ],
      "benefit": "Bring stewardship operations together for treasurers and parish administrators.",
      "displayOrder": 4,
      "active": true
    },
    {
      "id": "projects",
      "title": "Projects & Campaigns",
      "module": "Projects",
      "description": "Track building projects, installments, and special campaigns with progress visibility for leadership.",
      "image": "/images/product/projects.png",
      "alt": "EkklesiaNexus special projects and campaigns",
      "capabilities": [
        "Project funds",
        "Installments",
        "Campaign progress"
      ],
      "benefit": "Keep dedicated fundraising organized and easier to review with leadership.",
      "displayOrder": 5,
      "active": true
    },
    {
      "id": "ministries",
      "title": "Ministries & Associations",
      "module": "Ministries",
      "description": "Manage ministries, associations, and parish organizations with membership and leadership context.",
      "image": "/images/product/ministries.png",
      "alt": "EkklesiaNexus ministries and associations",
      "capabilities": [
        "Organizations",
        "Membership",
        "Leadership terms"
      ],
      "benefit": "See who serves and who leads across parish communities.",
      "displayOrder": 6,
      "active": true
    },
    {
      "id": "leadership",
      "title": "Parish Leadership",
      "module": "Leadership",
      "description": "Centralize clergy, staff, and organizational leadership information for continuity and review.",
      "image": "/images/product/leadership.png",
      "alt": "EkklesiaNexus parish leadership profiles",
      "capabilities": [
        "Church profile",
        "Leadership history",
        "Organizational roles"
      ],
      "benefit": "Support smoother transitions when volunteers and office-bearers change.",
      "displayOrder": 7,
      "active": true
    },
    {
      "id": "mass",
      "title": "Mass & Mass Intentions",
      "module": "Mass",
      "description": "Coordinate Mass schedules, intentions, and related parish worship administration in one workspace.",
      "image": "/images/product/mass-intentions.png",
      "alt": "EkklesiaNexus Mass intentions and schedules",
      "capabilities": [
        "Mass schedules",
        "Intentions",
        "Reporting where supported"
      ],
      "benefit": "Give sacristans and administrators a clearer worship-week picture.",
      "displayOrder": 8,
      "active": true
    },
    {
      "id": "reports",
      "title": "Reports & Insights",
      "module": "Reports",
      "description": "Turn organized parish records into practical visibility for review, planning, and follow-up.",
      "image": "/images/product/reports.png",
      "alt": "EkklesiaNexus reports and parish insights",
      "capabilities": [
        "Stewardship reports",
        "Exports where supported",
        "Executive dashboards"
      ],
      "benefit": "Support leadership conversations with information already in the parish system.",
      "displayOrder": 9,
      "active": true
    }
  ],
  "footer": {
    "statement": "The Next Generation of Church Management System. One connected church. Complete 360° management.",
    "links": [
      {
        "label": "Privacy",
        "href": "/privacy"
      },
      {
        "label": "Terms",
        "href": "/terms"
      }
    ]
  }
};
