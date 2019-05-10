FROM node

# Create app directory
WORKDIR /usr/src/app

RUN npm install -g ember-cli

# Bundle app source
COPY . .

CMD [ "npm", "start" ]
