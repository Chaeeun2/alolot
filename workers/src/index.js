export default {
  async fetch(request, env) {
    // CORS 헤더 설정
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    if (request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        
        if (!file) {
          return new Response(
            JSON.stringify({ error: 'File is required' }), 
            { 
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            }
          );
        }

        // 파일 이름에서 확장자 추출
        const originalName = file.name || '';
        const ext = originalName.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        // R2에 파일 업로드
        await env.ALOLOT_BUCKET.put(fileName, file.stream(), {
          httpMetadata: {
            contentType: file.type,
          },
        });

        // 성공 응답
        return new Response(
          JSON.stringify({ 
            success: true,
            fileName,
            url: `https://pub-3fe00d7ec86c464e858b195c403d720d.r2.dev/${fileName}`
          }), 
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error.message }), 
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders
    });
  }
}; 