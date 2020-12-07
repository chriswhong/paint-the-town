FROM node:12.20.0-alpine3.10

# Create app directory
WORKDIR /usr/src/app

RUN npm install -g ember-cli

# Bundle app source
COPY . .

RUN yarn install

RUN cd frontend && yarn install && ember build --environment=production --output-path=../public

CMD [ "npm", "start" ]
