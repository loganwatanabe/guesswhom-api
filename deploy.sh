GOOGLE_PROJECT_ID=guesswhomapi

gcloud builds submit --tag gcr.io/$GOOGLE_PROJECT_ID/guesswhomapi \
  --project=$GOOGLE_PROJECT_ID

gcloud beta run deploy barkbark-api \
  --image gcr.io/$GOOGLE_PROJECT_ID/guesswhomapi \
  --platform managed \
  --region us-central1 \
  --project=$GOOGLE_PROJECT_ID