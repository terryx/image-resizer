# Image resizer

### Some tips for development
Having a docker container setup is needed to <b>compile dependencies</b> for image library and also ensure that we never mess up with our local machine.

#### Create container
`docker-compose -f docker-compose.yml up -d`

#### Remove container
`docker stop image-resizer && docker rm image-resizer`

#### Install dependency & do some fun stuff inside container
`docker exec -it image-resizer /bin/bash`
