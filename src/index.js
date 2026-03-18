import { MongoClient } from 'mongodb';

const MONGO_URL = 'mongodb+srv://f:guardian21@cluster0.c4uh1ok.mongodb.net/?appName=Cluster0';

// Koneksi ke database akan di-reuse agar lebih cepat
let client = null;

async function getDbCollection() {
  try {
    if (!client || !client.topology.isConnected()) {
      client = new MongoClient(MONGO_URL);
      await client.connect();
      console.log("Koneksi MongoDB baru dibuat.");
    }
    return client.db('web_data').collection('views');
  } catch (error) {
    console.error("Gagal terhubung ke MongoDB:", error.message);
    // Jika gagal konek, kita lempar error agar Worker tahu ada masalah
    throw new Error("Tidak bisa terhubung ke database.");
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Header CORS (Penting agar tidak error jika domain frontend & backend beda)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Endpoint untuk menambah view (+1)
      if (request.method === 'POST' && url.pathname === '/visit') {
        const collection = await getDbCollection();
        const result = await collection.findOneAndUpdate(
          { id: 'main_counter' },
          { $inc: { totalViews: 1 } },
          { returnDocument: 'after', upsert: true }
        );
        
        // Kode anti-error: `?.` (optional chaining)
        // Aman bahkan jika 'result' atau 'value' tidak ada
        const views = result?.value?.totalViews || 1;

        return new Response(JSON.stringify({ views }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Endpoint untuk mengambil data view terbaru
      if (request.method === 'GET' && url.pathname === '/views') {
        const collection = await getDbCollection();
        const data = await collection.findOne({ id: 'main_counter' });

        // Kode anti-error: Default ke 0 jika data belum ada
        const views = data?.totalViews || 0;

        return new Response(JSON.stringify({ views }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Jika URL tidak cocok
      return new Response('Not Found', { status: 404, headers: corsHeaders });

    } catch (error) {
      // Ini akan menangkap SEMUA error (termasuk error koneksi DB)
      // dan menampilkannya dengan jelas.
      console.error("Worker Error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
