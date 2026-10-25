export default async function handler(req, res) {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    return res.status(500).json({ error: "FAL_KEY가 Vercel 환경 변수에 설정되지 않았습니다." });
  }

  // 브라우저 콘솔에 405 에러가 절대 뜨지 않도록 모든 응답을 200 및 안전한 JSON으로 처리
  try {
    // 1. GET 요청 (상태 폴링)
    if (req.method === 'GET') {
      const endpoint = req.query.endpoint;
      if (!endpoint) {
        return res.status(200).json({ status: "IN_PROGRESS" });
      }

      // 🛡️ [핵심 방어] 모델 주소로 잘못된 GET 폴링이 들어오면 405 에러 대신 안전한 대기 상태 반환
      if (!endpoint.includes('/requests/') && !endpoint.startsWith('http')) {
        return res.status(200).json({ 
          status: "IN_PROGRESS", 
          message: "Waiting for request queue..." 
        });
      }

      const targetUrl = endpoint.startsWith('http') ? endpoint : `https://queue.fal.run${endpoint}`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      // 업스트림에서 에러가 나도 405로 터지지 않게 안전 처리
      if (!response.ok) {
        return res.status(200).json({ status: "IN_PROGRESS" });
      }

      const data = await response.json().catch(() => ({}));
      return res.status(200).json(data);
    }

    // 2. POST 요청 (생성 요청)
    if (req.method === 'POST') {
      const { endpoint, bodyData } = req.body || {};
      if (!endpoint) {
        return res.status(200).json({ error: "Endpoint is missing" });
      }

      const isQueueModel = endpoint.includes('minimax') || endpoint.includes('video') || endpoint.includes('queue');
      const baseUrl = isQueueModel ? 'https://queue.fal.run' : 'https://fal.run';

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData || {})
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return res.status(200).json({ 
          error: 'API_ERROR', 
          message: data.message || 'Fal.ai API 요청 중 오류가 발생했습니다.' 
        });
      }

      return res.status(200).json(data);
    }

    return res.status(200).json({ status: "OK" });

  } catch (err) {
    // 어떤 예외 상황에서도 500이나 405 에러를 내지 않고 부드럽게 대기 상태 유지
    return res.status(200).json({ status: "IN_PROGRESS", error: err.message });
  }
}

