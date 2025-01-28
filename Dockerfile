#FROM ubuntu:20.04
FROM public.ecr.aws/ubuntu/ubuntu:20.04

# Instalar dependencias necesarias
RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    xz-utils \
    zip \
    libglu1-mesa \
    && rm -rf /var/lib/apt/lists/*

# Instalar Flutter
ENV FLUTTER_HOME=/usr/local/flutter
ENV PATH=$FLUTTER_HOME/bin:$PATH

RUN git clone https://github.com/flutter/flutter.git $FLUTTER_HOME && \
    cd $FLUTTER_HOME && \
    git checkout stable

WORKDIR /app

COPY . .

# Obtener dependencias y construir
RUN flutter pub get && \
    flutter build web --release

#/app/build/web/ 