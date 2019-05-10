FROM node

# Create app directory
WORKDIR /usr/src/app

<<<<<<< HEAD
RUN npm install -g ember-cli
=======
COPY package*.json ./

RUN npm install
>>>>>>> e236c599ecac1409d7d9843454fb786915d9387d

# Bundle app source
COPY . .

CMD [ "npm", "start" ]
