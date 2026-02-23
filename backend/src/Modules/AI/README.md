# AI Module

AI-powered insights and recommendations for Griham using HuggingFace Inference API.

## Structure

```
backend/src/Modules/AI/
├── Controllers/
│   └── AIController.php       # API endpoints for AI features
└── Services/
    ├── HuggingFaceClient.php  # HuggingFace API client
    └── AIService.php          # AI service layer
```

## Features

### 1. Finance Insights
- **Endpoint**: `GET /api/finance/ai/insights/{familyId}`
- **Description**: AI-powered financial health analysis
- **Returns**: 
  - Financial health assessment
  - Key observations
  - Actionable recommendations

### 2. Savings Tips
- **Endpoint**: `GET /api/finance/ai/savings-tips/{familyId}`
- **Description**: Personalized money-saving recommendations
- **Returns**: 
  - Category-based expense analysis
  - Practical savings tips

### 3. Bill Reminders (Service Method)
- **Method**: `AIService::generateBillReminder()`
- **Description**: Smart, friendly bill reminder messages

### 4. SMS Transaction Parser
- **Endpoint**: `POST /api/finance/ai/parse-sms/{familyId}`
- **Description**: Parse bank SMS and auto-create transaction
- **Input**: `{ "sms_text": "Your A/c debited Rs.5000..." }`
- **Returns**: 
  - Parsed transaction data (type, amount, category, date)
  - Created transaction object
  - Auto-updates account balance

## Configuration

Add to `.env`:
```env
HF_TOKEN=your_huggingface_token
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

Get your token: https://huggingface.co/settings/tokens

## Usage

### Backend
```php
use App\Modules\AI\Services\AIService;

$aiService = new AIService();
$insights = $aiService->generateFinanceInsights($data);
```

### Frontend
```typescript
import AIInsights from '@/components/AIInsights';

<AIInsights familyId={familyId} />
```

## Models Used

- **Text Generation**: Mistral-7B-Instruct-v0.2
- **API**: HuggingFace Inference API (free tier)
- **Fallback**: Graceful degradation if AI unavailable

## Future Enhancements

- [ ] Budget recommendations
- [ ] Expense pattern analysis
- [ ] Investment suggestions
- [ ] Bill payment predictions
- [ ] Financial goal tracking
- [ ] Anomaly detection
