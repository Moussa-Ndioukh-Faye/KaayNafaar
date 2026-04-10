const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');

// augmenter timeout car la mémoire peut prendre du temps
jest.setTimeout(30000);

describe('API Auth', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  test('inscription puis connexion', async () => {
    const utilisateur = {
      nom: 'Testeur',
      email: 'test@example.com',
      motDePasse: 'secret123',
      niveauEtude: 'licence',
    };

    const res1 = await request(app)
      .post('/api/auth/inscription')
      .send(utilisateur);

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.token).toBeDefined();
    expect(res1.headers['set-cookie']).toBeDefined();

    const res2 = await request(app)
      .post('/api/auth/connexion')
      .send({ email: utilisateur.email, motDePasse: utilisateur.motDePasse });

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.token).toBeDefined();
    expect(res2.headers['set-cookie']).toBeDefined();
  });

  test('profil protégé requiert authentification', async () => {
    const res = await request(app).get('/api/auth/profil');
    expect(res.status).toBe(401);
  });
});
