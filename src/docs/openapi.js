// Spécification OpenAPI 3 de l'API, servie par Swagger UI sur /api-docs.

// ---------- Aides à l'écriture ----------

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const one = (name) => ({ type: 'object', properties: { data: ref(name) } });
const many = (name) => ({
  type: 'object',
  properties: { data: { type: 'array', items: ref(name) }, pagination: ref('Pagination') },
});
// Même schéma, tous les champs facultatifs, au moins un champ requis.
const partial = ({ required, ...schema }) => ({ ...schema, minProperties: 1 });

const id = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '665f1c2e9b1d4a0012345678' },
});
const query = (name, schema, description) => ({ name, in: 'query', description, schema });

const PAGE = [{ $ref: '#/components/parameters/page' }, { $ref: '#/components/parameters/limit' }];
const SEARCH = [{ $ref: '#/components/parameters/q' }, ...PAGE];

// Filtres communs aux listes d'événements.
const EVENT_FILTERS = [
  { $ref: '#/components/parameters/q' },
  query('visibility', { type: 'string', enum: ['public', 'private'] }, 'Filtrer par visibilité'),
  query('from', { type: 'string', format: 'date-time' }, 'Événements se terminant après cette date'),
  query('to', { type: 'string', format: 'date-time' }, 'Événements commençant avant cette date'),
  query('mine', { type: 'boolean' }, 'true : uniquement les événements auxquels je participe'),
];

const GROUP = id('groupId', 'Identifiant du groupe');
const EVENT = id('eventId', "Identifiant de l'événement");
const USER = id('userId', "Identifiant de l'utilisateur");
const THREAD = id('threadId', 'Identifiant du fil de discussion');
const MESSAGE = id('messageId', 'Identifiant du message');
const ALBUM = id('albumId', "Identifiant de l'album");
const PHOTO = id('photoId', 'Identifiant de la photo');
const COMMENT = id('commentId', 'Identifiant du commentaire');
const POLL = id('pollId', 'Identifiant du sondage');
const TICKET_TYPE = id('ticketTypeId', 'Identifiant du type de billet');
const TICKET = id('ticketId', 'Identifiant du billet');

// Décrit une opération. `errors` liste les codes d'erreur propres à la route ;
// 429 et 500 sont ajoutés partout, 401 sur toute route authentifiée.
function op({
  tag,
  summary,
  description,
  auth = true,
  params = [],
  body,
  status = 200,
  returns,
  errors = [],
}) {
  const responses = {};
  responses[status] = returns
    ? { description: 'Succès', content: { 'application/json': { schema: returns } } }
    : { description: 'Succès, sans contenu' };

  const codes = new Set([...errors, 429, 500]);
  if (auth) codes.add(401);
  for (const code of [...codes].sort()) {
    responses[code] = { $ref: `#/components/responses/Error${code}` };
  }

  const operation = { tags: [tag], summary, responses };
  if (description) operation.description = description;
  if (params.length > 0) operation.parameters = params;
  if (body) {
    operation.requestBody = { required: true, content: { 'application/json': { schema: body } } };
  }
  operation.security = auth ? [{ bearerAuth: [] }] : [];
  return operation;
}

// ---------- Schémas ----------

const objectId = { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '665f1c2e9b1d4a0012345678' };
const date = { type: 'string', format: 'date-time' };
const url = { type: 'string', format: 'uri', description: 'URL http ou https', maxLength: 2048 };
const nullableUrl = { ...url, nullable: true };
const timestamps = { createdAt: date, updatedAt: date };
const author = { allOf: [ref('PublicUser')], nullable: true, description: 'Auteur (profil public)' };

const address = {
  type: 'object',
  required: ['street', 'postalCode', 'city', 'country'],
  properties: {
    street: { type: 'string', maxLength: 200, example: '12 rue de la Paix' },
    postalCode: { type: 'string', maxLength: 20, example: '75002' },
    city: { type: 'string', maxLength: 100, example: 'Paris' },
    country: { type: 'string', maxLength: 100, example: 'France' },
  },
};

const groupInput = {
  type: 'object',
  required: ['name'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', maxLength: 100, example: 'Rando Paris' },
    description: { type: 'string', maxLength: 2000 },
    icon: nullableUrl,
    coverPhoto: nullableUrl,
    type: { type: 'string', enum: ['public', 'private', 'secret'], default: 'public' },
    allowMembersToPost: {
      type: 'boolean',
      default: true,
      description: 'Autorise les membres à publier dans le groupe',
    },
    allowMembersToCreateEvents: {
      type: 'boolean',
      default: false,
      description: 'Autorise les membres à créer des événements dans le groupe',
    },
  },
};

const eventFields = {
  name: { type: 'string', maxLength: 100, example: 'Sortie à Fontainebleau' },
  description: { type: 'string', maxLength: 5000 },
  startDate: { ...date, example: '2030-06-09T08:00:00.000Z' },
  endDate: { ...date, example: '2030-06-09T17:00:00.000Z', description: 'Postérieure à startDate' },
  location: { type: 'string', maxLength: 200, example: 'Gare de Fontainebleau-Avon' },
  coverPhoto: nullableUrl,
  visibility: { type: 'string', enum: ['public', 'private'], default: 'public' },
  ticketingEnabled: {
    type: 'boolean',
    default: false,
    description: 'Active la billetterie (événement public uniquement)',
  },
};

const eventInput = {
  type: 'object',
  required: ['name', 'startDate', 'endDate', 'location'],
  additionalProperties: false,
  properties: {
    ...eventFields,
    organizers: {
      type: 'array',
      items: objectId,
      description: 'Organisateurs supplémentaires (le créateur est toujours organisateur)',
    },
    participants: { type: 'array', items: objectId, description: 'Participants à ajouter' },
  },
};

const pollInput = {
  type: 'object',
  required: ['title', 'questions'],
  additionalProperties: false,
  properties: {
    title: { type: 'string', maxLength: 200, example: 'Organisation de la sortie' },
    questions: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['text', 'options'],
        properties: {
          text: { type: 'string', maxLength: 300, example: 'Pique-nique ou restaurant ?' },
          options: {
            type: 'array',
            minItems: 2,
            items: {
              type: 'object',
              required: ['text'],
              properties: { text: { type: 'string', maxLength: 200, example: 'Pique-nique' } },
            },
          },
        },
      },
    },
  },
};

const ticketTypeInput = {
  type: 'object',
  required: ['name', 'amount', 'quantity'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', maxLength: 100, example: 'Tarif normal' },
    amount: { type: 'number', minimum: 0, example: 25.5, description: 'Montant du billet' },
    quantity: { type: 'integer', minimum: 1, example: 100, description: 'Quantité limitée de billets' },
  },
};

const albumInput = {
  type: 'object',
  required: ['title'],
  additionalProperties: false,
  properties: {
    title: { type: 'string', maxLength: 100, example: 'Photos de la sortie' },
    description: { type: 'string', maxLength: 1000 },
  },
};

const userFields = {
  firstName: { type: 'string', maxLength: 50, example: 'Alice' },
  lastName: { type: 'string', maxLength: 50, example: 'Martin' },
  email: { type: 'string', format: 'email', example: 'alice@example.com' },
  password: { type: 'string', format: 'password', minLength: 8, maxLength: 72, example: 'Password123!' },
  avatar: nullableUrl,
};

const schemas = {
  Error: {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Données invalides' },
          details: {
            type: 'array',
            description: 'Présent pour les erreurs de validation',
            items: {
              type: 'object',
              properties: {
                in: { type: 'string', enum: ['params', 'query', 'body'] },
                field: { type: 'string', example: 'email' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  Pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 42 },
      totalPages: { type: 'integer', example: 3 },
    },
  },
  UserIdInput: {
    type: 'object',
    required: ['userId'],
    additionalProperties: false,
    properties: { userId: objectId },
  },

  // Utilisateurs
  User: {
    type: 'object',
    description: 'Compte complet, visible uniquement par son propriétaire. Le mot de passe n’est jamais renvoyé.',
    properties: {
      id: objectId,
      firstName: userFields.firstName,
      lastName: userFields.lastName,
      email: userFields.email,
      avatar: nullableUrl,
      ...timestamps,
    },
  },
  PublicUser: {
    type: 'object',
    description: 'Profil visible par les autres utilisateurs (sans email)',
    properties: {
      id: objectId,
      firstName: userFields.firstName,
      lastName: userFields.lastName,
      avatar: nullableUrl,
    },
  },
  Member: {
    allOf: [
      ref('PublicUser'),
      {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['admin', 'member', 'organizer', 'participant'] },
        },
      },
    ],
  },
  RegisterInput: {
    type: 'object',
    required: ['firstName', 'lastName', 'email', 'password'],
    additionalProperties: false,
    properties: { ...userFields, avatar: url },
  },
  LoginInput: {
    type: 'object',
    required: ['email', 'password'],
    additionalProperties: false,
    properties: { email: userFields.email, password: userFields.password },
  },
  UserUpdate: { type: 'object', additionalProperties: false, minProperties: 1, properties: userFields },
  AuthResult: {
    type: 'object',
    properties: {
      user: ref('User'),
      token: { type: 'string', description: 'JWT à envoyer dans « Authorization: Bearer <token> »' },
    },
  },

  // Groupes
  Group: {
    type: 'object',
    description:
      'Un non-membre d’un groupe privé ne reçoit qu’un résumé : id, name, description, icon, coverPhoto, type, membersCount.',
    properties: {
      id: objectId,
      ...groupInput.properties,
      admins: { type: 'array', items: objectId },
      members: { type: 'array', items: objectId },
      membersCount: { type: 'integer' },
      createdBy: objectId,
      ...timestamps,
    },
  },
  GroupInput: groupInput,
  GroupUpdate: partial(groupInput),

  // Événements
  Event: {
    type: 'object',
    properties: {
      id: objectId,
      ...eventFields,
      organizers: { type: 'array', items: objectId },
      participants: { type: 'array', items: objectId },
      group: { ...objectId, nullable: true, description: 'Groupe dans lequel l’événement a été créé' },
      createdBy: objectId,
      ...timestamps,
    },
  },
  EventInput: eventInput,
  EventInGroupInput: {
    ...eventInput,
    properties: {
      ...eventInput.properties,
      inviteAllMembers: {
        type: 'boolean',
        default: false,
        description: 'Ajoute tous les membres du groupe comme participants, en une seule action',
      },
    },
  },
  EventUpdate: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: eventFields,
  },
  ShareLinks: {
    type: 'object',
    properties: {
      url: { type: 'string', format: 'uri', description: 'Adresse publique de l’événement' },
      title: { type: 'string' },
      links: {
        type: 'object',
        description: 'Liens de partage préremplis',
        properties: {
          x: { type: 'string', format: 'uri' },
          linkedin: { type: 'string', format: 'uri' },
          whatsapp: { type: 'string', format: 'uri' },
        },
      },
    },
  },

  // Fils de discussion
  Thread: {
    type: 'object',
    description: 'Lié à un groupe OU à un événement, jamais les deux',
    properties: { id: objectId, group: objectId, event: objectId, ...timestamps },
  },
  ThreadInput: {
    type: 'object',
    additionalProperties: false,
    description: 'Exactement l’un des deux champs',
    oneOf: [{ required: ['group'] }, { required: ['event'] }],
    properties: { group: objectId, event: objectId },
  },
  Message: {
    type: 'object',
    properties: {
      id: objectId,
      thread: objectId,
      author,
      content: { type: 'string', maxLength: 2000 },
      parent: { ...objectId, nullable: true, description: 'Message auquel celui-ci répond' },
      ...timestamps,
    },
  },
  MessageInput: {
    type: 'object',
    required: ['content'],
    additionalProperties: false,
    properties: { content: { type: 'string', maxLength: 2000, example: 'Qui vient dimanche ?' } },
  },

  // Albums photo
  Album: {
    type: 'object',
    properties: { id: objectId, event: objectId, ...albumInput.properties, createdBy: objectId, ...timestamps },
  },
  AlbumInput: albumInput,
  AlbumUpdate: partial(albumInput),
  Photo: {
    type: 'object',
    properties: {
      id: objectId,
      album: objectId,
      event: objectId,
      author,
      url,
      caption: { type: 'string', maxLength: 500 },
      ...timestamps,
    },
  },
  PhotoInput: {
    type: 'object',
    required: ['url'],
    additionalProperties: false,
    properties: {
      url: { ...url, example: 'https://picsum.photos/seed/rocher/800/600' },
      caption: { type: 'string', maxLength: 500 },
    },
  },
  PhotoUpdate: {
    type: 'object',
    required: ['caption'],
    additionalProperties: false,
    properties: { caption: { type: 'string', maxLength: 500 } },
  },
  Comment: {
    type: 'object',
    properties: {
      id: objectId,
      photo: objectId,
      event: objectId,
      author,
      content: { type: 'string', maxLength: 1000 },
      ...timestamps,
    },
  },
  CommentInput: {
    type: 'object',
    required: ['content'],
    additionalProperties: false,
    properties: { content: { type: 'string', maxLength: 1000, example: 'Superbe photo !' } },
  },

  // Sondages
  Poll: {
    type: 'object',
    properties: {
      id: objectId,
      event: objectId,
      title: { type: 'string' },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: objectId,
            text: { type: 'string' },
            options: {
              type: 'array',
              items: { type: 'object', properties: { id: objectId, text: { type: 'string' } } },
            },
          },
        },
      },
      createdBy: objectId,
      ...timestamps,
    },
  },
  PollInput: pollInput,
  PollUpdate: partial(pollInput),
  PollResponseInput: {
    type: 'object',
    required: ['answers'],
    additionalProperties: false,
    properties: {
      answers: {
        type: 'array',
        minItems: 1,
        description: 'Une entrée par question du sondage, sans doublon',
        items: {
          type: 'object',
          required: ['question', 'option'],
          properties: {
            question: { ...objectId, description: 'Identifiant de la question' },
            option: { ...objectId, description: 'Identifiant de la réponse choisie' },
          },
        },
      },
    },
  },
  PollResponse: {
    type: 'object',
    properties: {
      id: objectId,
      poll: objectId,
      user: { description: 'Identifiant, ou profil public dans la liste des réponses', oneOf: [objectId, ref('PublicUser')] },
      answers: {
        type: 'array',
        items: { type: 'object', properties: { question: objectId, option: objectId } },
      },
      ...timestamps,
    },
  },

  // Billetterie
  TicketType: {
    type: 'object',
    properties: {
      id: objectId,
      event: objectId,
      ...ticketTypeInput.properties,
      sold: { type: 'integer', description: 'Billets déjà vendus' },
      remaining: { type: 'integer', description: 'Billets encore disponibles' },
      ...timestamps,
    },
  },
  TicketTypeInput: ticketTypeInput,
  TicketTypeUpdate: partial(ticketTypeInput),
  TicketPurchaseInput: {
    type: 'object',
    required: ['firstName', 'lastName', 'email', 'address'],
    additionalProperties: false,
    properties: {
      firstName: { type: 'string', maxLength: 50, example: 'Paul' },
      lastName: { type: 'string', maxLength: 50, example: 'Lefèvre' },
      email: {
        type: 'string',
        format: 'email',
        example: 'paul.lefevre@example.com',
        description: 'Identifie la personne : un seul billet par email et par événement',
      },
      address,
    },
  },
  Ticket: {
    type: 'object',
    properties: {
      id: objectId,
      ticketType: { description: 'Identifiant, ou nom et montant dans les listes', oneOf: [objectId, ref('TicketType')] },
      event: objectId,
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      address,
      purchasedAt: { ...date, description: "Date d'achat" },
      ...timestamps,
    },
  },
};

// ---------- Routes ----------

const paths = {
  // ----- Authentification -----
  '/auth/register': {
    post: op({
      tag: 'Authentification',
      summary: 'Créer un compte',
      description: 'Limite stricte de requêtes. Le mot de passe est hashé (bcrypt) et jamais renvoyé.',
      auth: false,
      body: ref('RegisterInput'),
      status: 201,
      returns: one('AuthResult'),
      errors: [400, 409],
    }),
  },
  '/auth/login': {
    post: op({
      tag: 'Authentification',
      summary: 'Se connecter et obtenir un token JWT',
      description: 'Limite stricte de requêtes. Le message d’erreur est le même que l’email ou le mot de passe soit faux.',
      auth: false,
      body: ref('LoginInput'),
      returns: one('AuthResult'),
      errors: [400, 401],
    }),
  },
  '/auth/me': {
    get: op({ tag: 'Authentification', summary: 'Mon compte', returns: one('User') }),
  },

  // ----- Utilisateurs -----
  '/users': {
    get: op({
      tag: 'Utilisateurs',
      summary: 'Rechercher des utilisateurs',
      description: 'Recherche sur le prénom et le nom. Seul le profil public est renvoyé.',
      params: SEARCH,
      returns: many('PublicUser'),
      errors: [400],
    }),
  },
  '/users/{userId}': {
    get: op({
      tag: 'Utilisateurs',
      summary: 'Consulter un utilisateur',
      description: 'Profil public ; le compte complet (avec email) si c’est le mien.',
      params: [USER],
      returns: one('User'),
      errors: [400, 404],
    }),
    patch: op({
      tag: 'Utilisateurs',
      summary: 'Modifier mon compte',
      params: [USER],
      body: ref('UserUpdate'),
      returns: one('User'),
      errors: [400, 403, 409],
    }),
    delete: op({
      tag: 'Utilisateurs',
      summary: 'Supprimer mon compte',
      description: 'Refusé (409) tant que je suis le seul administrateur d’un groupe ou le seul organisateur d’un événement.',
      params: [USER],
      status: 204,
      errors: [400, 403, 409],
    }),
  },

  // ----- Groupes -----
  '/groups': {
    post: op({
      tag: 'Groupes',
      summary: 'Créer un groupe',
      description: 'Le créateur devient administrateur et membre. Le fil de discussion du groupe est créé en même temps.',
      body: ref('GroupInput'),
      status: 201,
      returns: one('Group'),
      errors: [400],
    }),
    get: op({
      tag: 'Groupes',
      summary: 'Rechercher des groupes',
      description: 'Les groupes secrets n’apparaissent que pour leurs membres. Les groupes privés apparaissent en résumé pour les non-membres.',
      params: [
        { $ref: '#/components/parameters/q' },
        query('type', { type: 'string', enum: ['public', 'private', 'secret'] }, 'Filtrer par type'),
        query('mine', { type: 'boolean' }, 'true : uniquement les groupes dont je suis membre'),
        ...PAGE,
      ],
      returns: many('Group'),
      errors: [400],
    }),
  },
  '/groups/{groupId}': {
    get: op({
      tag: 'Groupes',
      summary: 'Consulter un groupe',
      description: 'Groupe privé : réservé aux membres (403). Groupe secret : 404 pour un non-membre.',
      params: [GROUP],
      returns: one('Group'),
      errors: [400, 403, 404],
    }),
    patch: op({
      tag: 'Groupes',
      summary: 'Modifier un groupe (administrateur)',
      params: [GROUP],
      body: ref('GroupUpdate'),
      returns: one('Group'),
      errors: [400, 403, 404],
    }),
    delete: op({
      tag: 'Groupes',
      summary: 'Supprimer un groupe (administrateur)',
      description: 'Supprime aussi son fil de discussion. Ses événements sont conservés, détachés du groupe.',
      params: [GROUP],
      status: 204,
      errors: [400, 403, 404],
    }),
  },
  '/groups/{groupId}/members': {
    get: op({
      tag: 'Groupes',
      summary: 'Lister les membres et leur rôle',
      params: [GROUP, ...SEARCH],
      returns: many('Member'),
      errors: [400, 403, 404],
    }),
    post: op({
      tag: 'Groupes',
      summary: 'Ajouter un membre',
      description: 'Chacun peut rejoindre lui-même un groupe public. Sinon, seul un administrateur ajoute un membre.',
      params: [GROUP],
      body: ref('UserIdInput'),
      status: 201,
      returns: one('Group'),
      errors: [400, 403, 404, 409],
    }),
  },
  '/groups/{groupId}/members/{userId}': {
    delete: op({
      tag: 'Groupes',
      summary: 'Retirer un membre',
      description: 'Chacun peut quitter le groupe ; un administrateur peut retirer un membre. Le dernier administrateur ne peut pas partir (409).',
      params: [GROUP, USER],
      status: 204,
      errors: [400, 403, 404, 409],
    }),
  },
  '/groups/{groupId}/admins': {
    post: op({
      tag: 'Groupes',
      summary: 'Nommer un administrateur (administrateur)',
      description: 'L’utilisateur doit déjà être membre du groupe.',
      params: [GROUP],
      body: ref('UserIdInput'),
      status: 201,
      returns: one('Group'),
      errors: [400, 403, 404, 409],
    }),
  },
  '/groups/{groupId}/admins/{userId}': {
    delete: op({
      tag: 'Groupes',
      summary: 'Retirer un administrateur (administrateur)',
      description: 'Un groupe conserve toujours au moins un administrateur (409).',
      params: [GROUP, USER],
      status: 204,
      errors: [400, 403, 404, 409],
    }),
  },
  '/groups/{groupId}/events': {
    get: op({
      tag: 'Groupes',
      summary: 'Lister les événements du groupe',
      params: [GROUP, ...EVENT_FILTERS, ...PAGE],
      returns: many('Event'),
      errors: [400, 403, 404],
    }),
    post: op({
      tag: 'Groupes',
      summary: 'Créer un événement dans le groupe',
      description:
        'Autorisé pour un administrateur, ou pour un membre si le groupe a activé allowMembersToCreateEvents. ' +
        'inviteAllMembers ajoute tous les membres comme participants en une seule action.',
      params: [GROUP],
      body: ref('EventInGroupInput'),
      status: 201,
      returns: one('Event'),
      errors: [400, 403, 404, 409],
    }),
  },

  // ----- Événements -----
  '/events': {
    post: op({
      tag: 'Événements',
      summary: 'Créer un événement',
      description: 'Le créateur devient organisateur et participant.',
      body: ref('EventInput'),
      status: 201,
      returns: one('Event'),
      errors: [400, 409],
    }),
    get: op({
      tag: 'Événements',
      summary: 'Rechercher des événements',
      description: 'Un événement privé n’apparaît que pour ses participants. Recherche sur le nom, la description et le lieu.',
      params: [
        ...EVENT_FILTERS,
        query('group', objectId, 'Événements créés dans ce groupe'),
        ...PAGE,
      ],
      returns: many('Event'),
      errors: [400],
    }),
  },
  '/events/{eventId}': {
    get: op({
      tag: 'Événements',
      summary: 'Consulter un événement',
      description: 'Événement privé : réservé aux participants (403).',
      params: [EVENT],
      returns: one('Event'),
      errors: [400, 403, 404],
    }),
    patch: op({
      tag: 'Événements',
      summary: 'Modifier un événement (organisateur)',
      description: 'La billetterie ne peut pas être active sur un événement privé (409).',
      params: [EVENT],
      body: ref('EventUpdate'),
      returns: one('Event'),
      errors: [400, 403, 404, 409],
    }),
    delete: op({
      tag: 'Événements',
      summary: 'Supprimer un événement (organisateur)',
      description: 'Supprime aussi son fil, ses albums, ses sondages et sa billetterie.',
      params: [EVENT],
      status: 204,
      errors: [400, 403, 404],
    }),
  },
  '/events/{eventId}/share': {
    get: op({
      tag: 'Événements',
      summary: 'Obtenir les liens de partage sur les autres réseaux sociaux (organisateur)',
      description: 'Réservé aux événements créés dans un groupe public (409 sinon).',
      params: [EVENT],
      returns: one('ShareLinks'),
      errors: [400, 403, 404, 409],
    }),
  },
  '/events/{eventId}/participants': {
    get: op({
      tag: 'Événements',
      summary: 'Lister les participants et leur rôle',
      params: [EVENT, ...SEARCH],
      returns: many('Member'),
      errors: [400, 403, 404],
    }),
    post: op({
      tag: 'Événements',
      summary: 'Ajouter un participant',
      description: 'Chacun peut s’inscrire lui-même à un événement public. Sinon, seul un organisateur ajoute un participant.',
      params: [EVENT],
      body: ref('UserIdInput'),
      status: 201,
      returns: one('Event'),
      errors: [400, 403, 404, 409],
    }),
  },
  '/events/{eventId}/participants/{userId}': {
    delete: op({
      tag: 'Événements',
      summary: 'Retirer un participant',
      description: 'Chacun peut se désinscrire ; un organisateur peut retirer un participant.',
      params: [EVENT, USER],
      status: 204,
      errors: [400, 403, 404, 409],
    }),
  },
  '/events/{eventId}/organizers': {
    post: op({
      tag: 'Événements',
      summary: 'Nommer un organisateur (organisateur)',
      params: [EVENT],
      body: ref('UserIdInput'),
      status: 201,
      returns: one('Event'),
      errors: [400, 403, 404, 409],
    }),
  },
  '/events/{eventId}/organizers/{userId}': {
    delete: op({
      tag: 'Événements',
      summary: 'Retirer un organisateur (organisateur)',
      description: 'Un événement conserve toujours au moins un organisateur (409).',
      params: [EVENT, USER],
      status: 204,
      errors: [400, 403, 404, 409],
    }),
  },

  // ----- Fils de discussion -----
  '/threads': {
    post: op({
      tag: 'Fils de discussion',
      summary: 'Ouvrir un fil de discussion',
      description:
        'Lié à un groupe (administrateur) OU à un événement (organisateur) : fournir exactement l’un des deux (400 sinon). ' +
        'Un seul fil par groupe et par événement (409). Le fil d’un groupe est déjà créé avec le groupe.',
      body: ref('ThreadInput'),
      status: 201,
      returns: one('Thread'),
      errors: [400, 403, 404, 409],
    }),
    get: op({
      tag: 'Fils de discussion',
      summary: 'Lister mes fils de discussion',
      description: 'Fils des groupes dont je suis membre et des événements auxquels je participe.',
      params: [
        query('group', objectId, 'Fil de ce groupe'),
        query('event', objectId, 'Fil de cet événement (ne pas combiner avec group)'),
        ...PAGE,
      ],
      returns: many('Thread'),
      errors: [400],
    }),
  },
  '/threads/{threadId}': {
    get: op({
      tag: 'Fils de discussion',
      summary: 'Consulter un fil',
      description: 'Réservé aux membres du groupe ou aux participants de l’événement.',
      params: [THREAD],
      returns: one('Thread'),
      errors: [400, 403, 404],
    }),
    delete: op({
      tag: 'Fils de discussion',
      summary: 'Supprimer un fil et ses messages (administrateur ou organisateur)',
      params: [THREAD],
      status: 204,
      errors: [400, 403, 404],
    }),
  },
  '/threads/{threadId}/messages': {
    get: op({
      tag: 'Fils de discussion',
      summary: 'Lister les messages',
      description: 'Sans recherche : messages de premier niveau. Avec q : recherche dans tout le fil, réponses comprises.',
      params: [THREAD, ...SEARCH],
      returns: many('Message'),
      errors: [400, 403, 404],
    }),
    post: op({
      tag: 'Fils de discussion',
      summary: 'Publier un message',
      description: 'Dans un groupe : administrateurs, et membres si allowMembersToPost est activé. Dans un événement : tout participant.',
      params: [THREAD],
      body: ref('MessageInput'),
      status: 201,
      returns: one('Message'),
      errors: [400, 403, 404],
    }),
  },
  '/threads/{threadId}/messages/{messageId}': {
    get: op({
      tag: 'Fils de discussion',
      summary: 'Consulter un message',
      params: [THREAD, MESSAGE],
      returns: one('Message'),
      errors: [400, 403, 404],
    }),
    patch: op({
      tag: 'Fils de discussion',
      summary: 'Modifier un message (auteur)',
      params: [THREAD, MESSAGE],
      body: ref('MessageInput'),
      returns: one('Message'),
      errors: [400, 403, 404],
    }),
    delete: op({
      tag: 'Fils de discussion',
      summary: 'Supprimer un message et ses réponses (auteur, administrateur ou organisateur)',
      params: [THREAD, MESSAGE],
      status: 204,
      errors: [400, 403, 404],
    }),
  },
  '/threads/{threadId}/messages/{messageId}/replies': {
    get: op({
      tag: 'Fils de discussion',
      summary: 'Lister les réponses à un message',
      params: [THREAD, MESSAGE, ...SEARCH],
      returns: many('Message'),
      errors: [400, 403, 404],
    }),
    post: op({
      tag: 'Fils de discussion',
      summary: 'Répondre à un message',
      description: 'Ouvert à tout membre du groupe ou participant de l’événement.',
      params: [THREAD, MESSAGE],
      body: ref('MessageInput'),
      status: 201,
      returns: one('Message'),
      errors: [400, 403, 404],
    }),
  },

  // ----- Albums photo -----
  '/events/{eventId}/albums': {
    post: op({
      tag: 'Albums photo',
      summary: 'Créer un album (organisateur)',
      params: [EVENT],
      body: ref('AlbumInput'),
      status: 201,
      returns: one('Album'),
      errors: [400, 403, 404],
    }),
    get: op({
      tag: 'Albums photo',
      summary: "Lister les albums de l'événement (participant)",
      params: [EVENT, ...SEARCH],
      returns: many('Album'),
      errors: [400, 403, 404],
    }),
  },
  '/events/{eventId}/albums/{albumId}': {
    get: op({
      tag: 'Albums photo',
      summary: 'Consulter un album (participant)',
      params: [EVENT, ALBUM],
      returns: one('Album'),
      errors: [400, 403, 404],
    }),
    patch: op({
      tag: 'Albums photo',
      summary: 'Modifier un album (organisateur)',
      params: [EVENT, ALBUM],
      body: ref('AlbumUpdate'),
      returns: one('Album'),
      errors: [400, 403, 404],
    }),
    delete: op({
      tag: 'Albums photo',
      summary: 'Supprimer un album, ses photos et leurs commentaires (organisateur)',
      params: [EVENT, ALBUM],
      status: 204,
      errors: [400, 403, 404],
    }),
  },
  '/albums/{albumId}/photos': {
    post: op({
      tag: 'Albums photo',
      summary: 'Poster une photo (participant)',
      description: 'La photo est fournie sous forme d’URL http ou https.',
      params: [ALBUM],
      body: ref('PhotoInput'),
      status: 201,
      returns: one('Photo'),
      errors: [400, 403, 404],
    }),
    get: op({
      tag: 'Albums photo',
      summary: "Lister les photos de l'album (participant)",
      params: [ALBUM, ...SEARCH],
      returns: many('Photo'),
      errors: [400, 403, 404],
    }),
  },
  '/albums/{albumId}/photos/{photoId}': {
    get: op({
      tag: 'Albums photo',
      summary: 'Consulter une photo (participant)',
      params: [ALBUM, PHOTO],
      returns: one('Photo'),
      errors: [400, 403, 404],
    }),
    patch: op({
      tag: 'Albums photo',
      summary: "Modifier la légende d'une photo (auteur)",
      params: [ALBUM, PHOTO],
      body: ref('PhotoUpdate'),
      returns: one('Photo'),
      errors: [400, 403, 404],
    }),
    delete: op({
      tag: 'Albums photo',
      summary: 'Supprimer une photo et ses commentaires (auteur ou organisateur)',
      params: [ALBUM, PHOTO],
      status: 204,
      errors: [400, 403, 404],
    }),
  },
  '/photos/{photoId}/comments': {
    post: op({
      tag: 'Albums photo',
      summary: 'Commenter une photo (participant)',
      params: [PHOTO],
      body: ref('CommentInput'),
      status: 201,
      returns: one('Comment'),
      errors: [400, 403, 404],
    }),
    get: op({
      tag: 'Albums photo',
      summary: "Lister les commentaires d'une photo (participant)",
      params: [PHOTO, ...SEARCH],
      returns: many('Comment'),
      errors: [400, 403, 404],
    }),
  },
  '/photos/{photoId}/comments/{commentId}': {
    get: op({
      tag: 'Albums photo',
      summary: 'Consulter un commentaire (participant)',
      params: [PHOTO, COMMENT],
      returns: one('Comment'),
      errors: [400, 403, 404],
    }),
    patch: op({
      tag: 'Albums photo',
      summary: 'Modifier un commentaire (auteur)',
      params: [PHOTO, COMMENT],
      body: ref('CommentInput'),
      returns: one('Comment'),
      errors: [400, 403, 404],
    }),
    delete: op({
      tag: 'Albums photo',
      summary: 'Supprimer un commentaire (auteur ou organisateur)',
      params: [PHOTO, COMMENT],
      status: 204,
      errors: [400, 403, 404],
    }),
  },

  // ----- Sondages -----
  '/events/{eventId}/polls': {
    post: op({
      tag: 'Sondages',
      summary: 'Créer un sondage (organisateur)',
      description: 'Au moins une question ; au moins deux réponses possibles par question.',
      params: [EVENT],
      body: ref('PollInput'),
      status: 201,
      returns: one('Poll'),
      errors: [400, 403, 404],
    }),
    get: op({
      tag: 'Sondages',
      summary: "Lister les sondages de l'événement (participant)",
      params: [EVENT, ...SEARCH],
      returns: many('Poll'),
      errors: [400, 403, 404],
    }),
  },
  '/events/{eventId}/polls/{pollId}': {
    get: op({
      tag: 'Sondages',
      summary: 'Consulter un sondage (participant)',
      params: [EVENT, POLL],
      returns: one('Poll'),
      errors: [400, 403, 404],
    }),
    patch: op({
      tag: 'Sondages',
      summary: 'Modifier un sondage (organisateur)',
      description: 'Les questions ne sont plus modifiables dès qu’un participant a répondu (409).',
      params: [EVENT, POLL],
      body: ref('PollUpdate'),
      returns: one('Poll'),
      errors: [400, 403, 404, 409],
    }),
    delete: op({
      tag: 'Sondages',
      summary: 'Supprimer un sondage et ses réponses (organisateur)',
      params: [EVENT, POLL],
      status: 204,
      errors: [400, 403, 404],
    }),
  },
  '/polls/{pollId}/responses': {
    post: op({
      tag: 'Sondages',
      summary: 'Répondre à un sondage (participant)',
      description:
        'Une réponse par question, choisie parmi les réponses proposées, pour chaque question (400 sinon). ' +
        'Un participant ne répond qu’une seule fois (409).',
      params: [POLL],
      body: ref('PollResponseInput'),
      status: 201,
      returns: one('PollResponse'),
      errors: [400, 403, 404, 409],
    }),
    get: op({
      tag: 'Sondages',
      summary: 'Lister toutes les réponses (organisateur)',
      params: [POLL, ...PAGE],
      returns: many('PollResponse'),
      errors: [400, 403, 404],
    }),
  },
  '/polls/{pollId}/responses/me': {
    get: op({
      tag: 'Sondages',
      summary: 'Consulter ma réponse (participant)',
      params: [POLL],
      returns: one('PollResponse'),
      errors: [400, 403, 404],
    }),
  },

  // ----- Billetterie -----
  '/events/{eventId}/ticket-types': {
    post: op({
      tag: 'Billetterie',
      summary: 'Créer un type de billet (organisateur)',
      description: 'Uniquement sur un événement public dont la billetterie est activée (409 sinon).',
      params: [EVENT],
      body: ref('TicketTypeInput'),
      status: 201,
      returns: one('TicketType'),
      errors: [400, 403, 404, 409],
    }),
    get: op({
      tag: 'Billetterie',
      summary: 'Lister les billets en vente (public, sans compte)',
      auth: false,
      params: [EVENT, ...SEARCH],
      returns: many('TicketType'),
      errors: [400, 404, 409],
    }),
  },
  '/events/{eventId}/ticket-types/{ticketTypeId}': {
    get: op({
      tag: 'Billetterie',
      summary: 'Consulter un type de billet (public, sans compte)',
      auth: false,
      params: [EVENT, TICKET_TYPE],
      returns: one('TicketType'),
      errors: [400, 404, 409],
    }),
    patch: op({
      tag: 'Billetterie',
      summary: 'Modifier un type de billet (organisateur)',
      description: 'La quantité ne peut pas descendre sous le nombre de billets déjà vendus (409).',
      params: [EVENT, TICKET_TYPE],
      body: ref('TicketTypeUpdate'),
      returns: one('TicketType'),
      errors: [400, 403, 404, 409],
    }),
    delete: op({
      tag: 'Billetterie',
      summary: 'Supprimer un type de billet (organisateur)',
      description: 'Refusé si des billets de ce type ont déjà été vendus (409).',
      params: [EVENT, TICKET_TYPE],
      status: 204,
      errors: [400, 403, 404, 409],
    }),
  },
  '/ticket-types/{ticketTypeId}/tickets': {
    post: op({
      tag: 'Billetterie',
      summary: 'Acheter un billet (public, sans compte)',
      description:
        'Une personne extérieure obtient un seul billet par événement, identifiée par son email (409 TICKET_ALREADY_OWNED). ' +
        'La quantité limitée n’est jamais dépassée, même avec des achats simultanés (409 SOLD_OUT). Limite stricte de requêtes.',
      auth: false,
      params: [TICKET_TYPE],
      body: ref('TicketPurchaseInput'),
      status: 201,
      returns: one('Ticket'),
      errors: [400, 404, 409],
    }),
  },
  '/events/{eventId}/tickets': {
    get: op({
      tag: 'Billetterie',
      summary: 'Lister les billets vendus (organisateur)',
      description: 'Recherche sur le nom, le prénom et l’email de l’acheteur.',
      params: [
        EVENT,
        { $ref: '#/components/parameters/q' },
        query('ticketType', objectId, 'Filtrer par type de billet'),
        ...PAGE,
      ],
      returns: many('Ticket'),
      errors: [400, 403, 404],
    }),
  },
  '/events/{eventId}/tickets/{ticketId}': {
    get: op({
      tag: 'Billetterie',
      summary: 'Consulter un billet (organisateur)',
      params: [EVENT, TICKET],
      returns: one('Ticket'),
      errors: [400, 403, 404],
    }),
    delete: op({
      tag: 'Billetterie',
      summary: 'Annuler un billet (organisateur)',
      description: 'La place est remise en vente.',
      params: [EVENT, TICKET],
      status: 204,
      errors: [400, 403, 404],
    }),
  },
};

// ---------- Document ----------

const errorResponse = (description, code, message) => ({
  description,
  content: {
    'application/json': { schema: ref('Error'), example: { error: { code, message } } },
  },
});

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'My Social Networks API',
    version: '1.0.0',
    description:
      'API REST du TP « My Social Networks » : utilisateurs, groupes, événements, fils de discussion, ' +
      'albums photo, sondages et billetterie.\n\n' +
      '**Authentification** : obtenir un token avec `POST /auth/login`, puis cliquer sur « Authorize » et le coller. ' +
      'Il est envoyé dans l’en-tête `Authorization: Bearer <token>`.\n\n' +
      '**Réponses** : `{ "data": ... }` pour une ressource, `{ "data": [...], "pagination": {...} }` pour une liste, ' +
      '`{ "error": { "code", "message", "details" } }` pour une erreur.',
  },
  servers: [{ url: '/api', description: 'Ce serveur' }],
  tags: [
    { name: 'Authentification', description: 'Inscription, connexion, token JWT' },
    { name: 'Utilisateurs' },
    { name: 'Groupes', description: 'Groupes publics, privés ou secrets, membres et administrateurs' },
    { name: 'Événements', description: 'Événements publics ou privés, participants et organisateurs' },
    { name: 'Fils de discussion', description: 'Un fil par groupe ou par événement, messages et réponses' },
    { name: 'Albums photo', description: 'Albums d’un événement, photos et commentaires' },
    { name: 'Sondages', description: 'Sondages d’un événement et réponses des participants' },
    { name: 'Billetterie', description: 'Types de billets et billets des événements publics' },
  ],
  paths,
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    parameters: {
      q: {
        name: 'q',
        in: 'query',
        description: 'Texte recherché (insensible à la casse)',
        schema: { type: 'string', maxLength: 100 },
      },
      page: {
        name: 'page',
        in: 'query',
        description: 'Numéro de page',
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      limit: {
        name: 'limit',
        in: 'query',
        description: 'Nombre de résultats par page',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
    responses: {
      Error400: errorResponse(
        'Données invalides : validation, champ interdit, identifiant mal formé',
        'VALIDATION_ERROR',
        'Données invalides'
      ),
      Error401: errorResponse(
        'Non authentifié : token absent, invalide ou expiré',
        'UNAUTHORIZED',
        'Authentification requise'
      ),
      Error403: errorResponse('Authentifié, mais droits insuffisants', 'FORBIDDEN', 'Accès refusé'),
      Error404: errorResponse('Ressource introuvable', 'NOT_FOUND', 'Ressource introuvable'),
      Error409: errorResponse(
        'Conflit avec l’état actuel de la ressource (doublon, quantité épuisée, dernier administrateur...)',
        'CONFLICT',
        'Cette ressource existe déjà'
      ),
      Error429: errorResponse(
        'Trop de requêtes : limite de débit atteinte',
        'TOO_MANY_REQUESTS',
        'Trop de requêtes, réessayez plus tard'
      ),
      Error500: errorResponse('Erreur interne du serveur', 'INTERNAL_ERROR', 'Erreur interne du serveur'),
    },
    schemas,
  },
};
