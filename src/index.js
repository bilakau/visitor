import { MongoClient } from 'mongodb';

// Ganti ***** dengan password database kamu yang baru!
const MONGO_URL = 'mongodb+srv://f:guardian21@cluster0.c4uh1ok.mongodb.net/?appName=Cluster0';
let client = null;

async function connectDB() {
  if (!client) {
    client = new MongoClient(MONGO_URL);
    await client.connect();
  }
  // Database bernama 'web_data', tabel bernama 'views'
  return client.db('web_data').collection('views');
}

export default {
  async fetch(request, env, ctx) {
    // CORS agar website bisa mengambil data dari API ini
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      const collection = await connectDB();

      // JIKA WEBSITE MENGIRIM PENGUNJUNG BARU (POST /visit)
      if (request.method === 'POST' && url.pathname === '/visit') {
        const result = await collection.findOneAndUpdate(
          { id: 'main_counter' },
          { $inc: { totalViews: 1 } },
          { returnDocument: 'after', upsert: true }
        );
        return new Response(JSON.stringify({ views: result.value?.totalViews || 1 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // JIKA WEBSITE MINTA DATA REALTIME (GET /views)
      if (request.method === 'GET' && url.pathname === '/views') {
        let data = await collection.findOne({ id: 'main_counter' });
        if (!data) data = { totalViews: 0 };
        
        return new Response(JSON.stringify({ views: data.totalViews }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response('Route tidak ditemukan', { status: 404, headers: corsHeaders });
      
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  },
};
