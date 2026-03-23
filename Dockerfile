# Hafif ve hızlı bir Python imajı seçiyoruz
FROM python:3.11-slim

# Çalışma dizinini ayarlıyoruz
WORKDIR /app

# Önce sadece requirements.txt'yi kopyalayıp bağımlılıkları kuruyoruz (Docker cache avantajı için)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Şimdi projenin geri kalan tüm dosyalarını kopyalıyoruz
COPY . .

# Gunicorn ile Flask uygulamasını 5000 portunda başlatıyoruz
# ÖNEMLİ NOT: Eğer ana Python dosyanın adı 'app.py' değil de 'main.py' ise, 
# aşağıdaki 'app:app' kısmını 'main:app' olarak değiştirmelisin.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
