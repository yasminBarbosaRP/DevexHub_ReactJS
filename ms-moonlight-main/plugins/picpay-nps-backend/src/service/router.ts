/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { errorHandler, PluginDatabaseManager } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { DatabaseNPS } from '../database/DatabaseNPS';
import { getUserToken } from '@internal/plugin-picpay-core-components';
import { AvailableNps } from './AvailableNps';

export interface RouterOptions {
  config: Config;
  logger: Logger;
  database: PluginDatabaseManager;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { config, logger, database } = options;
  const dbHandler = await DatabaseNPS.create({ database });
  const availableNps = new AvailableNps({ database: dbHandler });

  logger.info('Initializing NPS backend');

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.send({ status: 'ok' });
  });

  router.get('/survey', async (_, response) => {
    const surveys = await dbHandler.surveyRepository().findAll();

    response.status(200).json({ data: surveys });
  });

  router.get('/survey/:id', async (request, response) => {
    const survey = await dbHandler
      .surveyRepository()
      .findById(decodeURIComponent(request.params.id));

    if (survey?.length) {
      response.status(200).json({ data: survey });
    } else {
      response.status(404).json({ data: 'Record not found' });
    }
  });

  router.post('/survey', async (request, response) => {
    const survey = request.body;

    const result = await dbHandler.surveyRepository().add(survey);
    response.status(202).json(result);
  });

  router.put('/survey/:id', async (request, response) => {
    const id = decodeURIComponent(request.params.id);
    const survey = request.body;

    await dbHandler.surveyRepository().change(id, survey);
    response.sendStatus(202);
  });

  router.delete('/survey/:id', async (request, response) => {
    const deleteSurvey = await dbHandler
      .surveyRepository()
      .delete(decodeURIComponent(request.params.id));

    if (deleteSurvey) {
      response.sendStatus(202);
    } else {
      response.status(404).json({ message: 'Record not found' });
    }
  });

  router.get('/answer/:survey_id', async (request, response) => {
    const surveyId = decodeURIComponent(request.params.survey_id);
    const answer = await dbHandler
      .answerRepository()
      .find({ survey_id: surveyId });

    if (answer?.length) {
      response.status(200).json({ data: answer });
    } else {
      response.status(404).json({ data: 'Record not found' });
    }
  });

  router.get('/:user/participated-surveys', async (request, response) => {
    const user = decodeURIComponent(request.params.user);
    const result = await dbHandler
      .answerRepository()
      .getParticipatedSurvey(user);

    if (result?.length) {
      response.status(200).json({ data: [result] });
    } else {
      response.status(404).json({ data: 'Record not found' });
    }
  });

  router.get('/available/survey/:route?', async (request, response) => {
    const user = await getUserToken({ config, request });

    if (!user) {
      response.status(401);
      response.end();
      return;
    }

    const availableSurvey = await availableNps.getSurvey(
      user.name,
      request.params.route,
    );

    response.status(200).json({ data: availableSurvey });
  });

  router.post('/answer', async (request, response) => {
    const answer = request.body;
    const user = await getUserToken({ config, request });

    if (!user) {
      response.status(401);
      response.end();
      return;
    }

    const result = await dbHandler.answerRepository().add({ ...answer, user });

    response.status(202).json(result);
  });

  router.get('/skipped-answers/:survey', async (request, response) => {
    const survey = decodeURIComponent(request.params.survey);
    const result = await dbHandler
      .skippedRepository()
      .getSkippedAnswerBySurvey(survey);

    if (result?.length) {
      response.status(200).json({ data: [result] });
    } else {
      response.status(404).json({ data: 'Record not found' });
    }
  });

  router.post('/postpone', async (request, response) => {
    const { survey } = request.body;
    const user = await getUserToken({ config, request });

    if (!user) {
      response.status(401);
      response.end();
      return;
    }

    const result = await dbHandler.skippedRepository().postpone(survey, user.name);
    response.status(202).json(result);
  });

  router.use(errorHandler());
  return router;
}
