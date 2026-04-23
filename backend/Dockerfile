FROM ruby:3.3-slim

RUN apt-get update -qq && apt-get install -y \
    build-essential \
    libpq-dev \
    postgresql-client \
    libyaml-dev \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN gem install bundler -v 2.5.18

COPY Gemfile ./
RUN bundle install

EXPOSE 3000
