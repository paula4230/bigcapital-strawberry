import React from 'react';
import { Field, ErrorMessage, FastField } from 'formik';
import { FormGroup, InputGroup } from '@blueprintjs/core';
import { inputIntent } from 'utils';
import { Row, Col, MoneyInputGroup } from 'components';
import { FormattedMessage as T } from 'react-intl';
import { decrementQuantity } from './utils';
import { toSafeNumber } from 'utils';

function DecrementAdjustmentFields() {
  return (
    <Row className={'row--decrement-fields'}>
      {/*------------ Quantity on hand  -----------*/}
      <Col className={'col--quantity-on-hand'}>
        <FastField name={'quantity_on_hand'}>
          {({ field, meta: { error, touched } }) => (
            <FormGroup
              label={<T id={'qty_on_hand'} />}
              intent={inputIntent({ error, touched })}
              helperText={<ErrorMessage name="quantity_on_hand" />}
            >
              <InputGroup disabled={true} medium={'true'} {...field} />
            </FormGroup>
          )}
        </FastField>
      </Col>

      <Col className={'col--sign'}>
        <span>–</span>
      </Col>

      {/*------------ Decrement -----------*/}
      <Col className={'col--decrement'}>
        <Field name={'quantity'}>
          {({
            form: { values, setFieldValue },
            field,
            meta: { error, touched },
          }) => (
            <FormGroup
              label={<T id={'decrement'} />}
              intent={inputIntent({ error, touched })}
              helperText={<ErrorMessage name="quantity" />}
              fill={true}
            >
              <MoneyInputGroup
                value={field.value}
                allowDecimals={false}
                allowNegativeValue={true}
                onChange={(value) => {
                  setFieldValue('quantity', value);
                }}
                onBlurValue={(value) => {
                  setFieldValue(
                    'new_quantity',
                    decrementQuantity(
                      toSafeNumber(value),
                      toSafeNumber(values.quantity_on_hand),
                    ),
                  );
                }}
              />
            </FormGroup>
          )}
        </Field>
      </Col>

      <Col className={'col--sign'}>
        <span>=</span>
      </Col>
      {/*------------ New quantity -----------*/}
      <Col className={'col--quantity'}>
        <Field name={'new_quantity'}>
          {({
            form: { values, setFieldValue },
            field,
            meta: { error, touched },
          }) => (
            <FormGroup
              label={<T id={'new_quantity'} />}
              intent={inputIntent({ error, touched })}
              helperText={<ErrorMessage name="new_quantity" />}
            >
              <MoneyInputGroup
                value={field.value}
                allowDecimals={false}
                allowNegativeValue={true}
                onChange={(value) => {
                  setFieldValue('new_quantity', value);
                }}
                onBlurValue={(value) => {
                  setFieldValue(
                    'quantity',
                    decrementQuantity(
                      toSafeNumber(value),
                      toSafeNumber(values.quantity_on_hand),
                    ),
                  );
                }}
              />
            </FormGroup>
          )}
        </Field>
      </Col>
    </Row>
  );
}

export default DecrementAdjustmentFields;
