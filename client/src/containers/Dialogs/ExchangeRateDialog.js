import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Button,
  Classes,
  FormGroup,
  InputGroup,
  Intent,
  Position,
  MenuItem,
} from '@blueprintjs/core';
import { pick } from 'lodash';
import * as Yup from 'yup';
import { FormattedMessage as T, useIntl } from 'react-intl';
import { useFormik } from 'formik';
import Dialog from 'components/Dialog';
import AppToaster from 'components/AppToaster';

import { useQuery, queryCache } from 'react-query';
import ErrorMessage from 'components/ErrorMessage';
import classNames from 'classnames';
import { Select } from '@blueprintjs/select';
import moment from 'moment';
import { DateInput } from '@blueprintjs/datetime';
import { momentFormatter } from 'utils';

import withExchangeRatesDialog from './ExchangeRateDialog.container';


function ExchangeRateDialog({
  name,
  payload,
  isOpen,

  // #withDialog
  closeDialog,

  // #withCurrencies
  currenciesList,

  // #withExchangeRatesActions
  requestSubmitExchangeRate,
  requestFetchExchangeRates,
  requestEditExchangeRate,
  requestFetchCurrencies,
  editExchangeRate,

}) {
  const { formatMessage } = useIntl();
  const [selectedItems, setSelectedItems] = useState({});

  const validationSchema = Yup.object().shape({
    exchange_rate: Yup.number().required().label(formatMessage({id:'exchange_rate_'})),
    currency_code: Yup.string().max(3).required(formatMessage({id:'currency_code_'})),
    date: Yup.date().required().label(formatMessage({id:'date'})),
  });

  const initialValues = useMemo(() => ({
    exchange_rate: '',
    currency_code: '',
    date: moment(new Date()).format('YYYY-MM-DD'),
  }), []);

  const {
    values,
    touched,
    errors,
    isSubmitting,
    handleSubmit,
    getFieldProps,
    setFieldValue,
    resetForm,
  } = useFormik({
    enableReinitialize: true,
    validationSchema,
    initialValues: {
      ...(payload.action === 'edit' &&
        pick(editExchangeRate, Object.keys(initialValues))),
    },
    onSubmit: (values, { setSubmitting }) => {
      if (payload.action === 'edit') {
        requestEditExchangeRate(payload.id, values)
          .then((response) => {
            closeDialog(name);
            AppToaster.show({
              message: formatMessage({id:'the_exchange_rate_has_been_successfully_edited'})
            });
            setSubmitting(false);
          })
          .catch((error) => {
            setSubmitting(false);
          });
      } else {
        requestSubmitExchangeRate(values)
          .then((response) => {
            closeDialog(name);
            AppToaster.show({
              message: formatMessage({id:'the_exchange_rate_has_been_successfully_created'})
            });
            setSubmitting(false);
          })
          .catch((error) => {
            setSubmitting(false);
          });
      }
    },
  });

  const requiredSpan = useMemo(() => <span class='required'>*</span>, []);

  const handleClose = useCallback(() => {
    closeDialog(name);
  }, [name, closeDialog]);

  const fetchExchangeRatesDialog = useQuery('exchange-rates-dialog',
    () => requestFetchExchangeRates());

  const onDialogClosed = useCallback(() => {
    resetForm();
    closeDialog(name);
  }, [closeDialog, name]);

  const onDialogOpening = useCallback(() => {
    fetchExchangeRatesDialog.refetch();
  }, [fetchExchangeRatesDialog]);

  const handleDateChange = useCallback(
    (date) => {
      const formatted = moment(date).format('YYYY-MM-DD');
      setFieldValue('date', formatted);
    },
    [setFieldValue]
  );

  const onItemsSelect = useCallback(
    (filedName) => {
      return (filed) => {
        setSelectedItems({
          ...selectedItems,
          [filedName]: filed,
        });
        setFieldValue(filedName, filed.currency_code);
      };
    },
    [setFieldValue, selectedItems]
  );

  const filterCurrencyCode = (query, currency_code, _index, exactMatch) => {
    const normalizedTitle = currency_code.currency_code.toLowerCase();
    const normalizedQuery = query.toLowerCase();

    if (exactMatch) {
      return normalizedTitle === normalizedQuery;
    } else {
      return (
        `${currency_code.currency_code} ${normalizedTitle}`.indexOf(
          normalizedQuery
        ) >= 0
      );
    }
  };

  const currencyCodeRenderer = useCallback((CurrencyCode, { handleClick }) => {
    return (
      <MenuItem
        className={'exchangeRate-menu'}
        key={CurrencyCode.id}
        text={CurrencyCode.currency_code}
        onClick={handleClick}
      />
    );
  }, []);

  const getSelectedItemLabel = useCallback((fieldName, defaultLabel) => {
    return typeof selectedItems[fieldName] !== 'undefined'
      ? selectedItems[fieldName].currency_code
      : defaultLabel;
  }, [selectedItems]);

  return (
    <Dialog
      name={name}
      title={payload.action === 'edit'
        ? <T id={'edit_exchange_rate'}/> : <T id={'new_exchange_rate'}/>}
      className={classNames(
        {'dialog--loading': fetchExchangeRatesDialog.isFetching},
        'dialog--exchangeRate-form'
      )}
      isOpen={isOpen}
      onClosed={onDialogClosed}
      onOpening={onDialogOpening}
      isLoading={fetchExchangeRatesDialog.isFetching}
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit}>
        <div className={Classes.DIALOG_BODY}>
          <FormGroup
            label={<T id={'date'}/>}
            inline={true}
            labelInfo={requiredSpan}
            intent={errors.date && touched.date && Intent.DANGER}
            helperText={<ErrorMessage name='date' {...{errors, touched}} />}
          >
            <DateInput
              fill={true}
              {...momentFormatter('YYYY-MM-DD')}
              defaultValue={new Date()}
              onChange={handleDateChange}
              popoverProps={{ position: Position.BOTTOM }}
              // disabled={payload.action === 'edit'}
            />
          </FormGroup>

          <FormGroup
            label={<T id={'exchange_rate'}/>}
            labelInfo={requiredSpan}
            intent={errors.exchange_rate && touched.exchange_rate && Intent.DANGER}
            helperText={<ErrorMessage name='exchange_rate' {...{errors, touched}} />}
            inline={true}
          >
            <InputGroup
              medium={true}
              intent={errors.exchange_rate && touched.exchange_rate && Intent.DANGER}
              {...getFieldProps('exchange_rate')}
            />
          </FormGroup>

          <FormGroup
            label={<T id={'currency_code'}/>}
            labelInfo={requiredSpan}
            className={classNames('form-group--select-list', Classes.FILL)}
            inline={true}
            intent={(errors.currency_code && touched.currency_code) && Intent.DANGER}
            helperText={<ErrorMessage name='currency_code' {...{errors, touched}} />}
          >
            <Select
              items={currenciesList}
              noResults={<MenuItem disabled={true} text='No results.' />}
              itemRenderer={currencyCodeRenderer}
              itemPredicate={filterCurrencyCode}
              popoverProps={{ minimal: true }}
              onItemSelect={onItemsSelect('currency_code')}
            >
              <Button
                rightIcon='caret-down'
                fill={true}
                text={getSelectedItemLabel(
                  'currency_code',
                  'select Currency Code'
                )}
              />
            </Select>
          </FormGroup>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={handleClose}><T id={'close'}/></Button>
            <Button intent={Intent.PRIMARY} type='submit' disabled={isSubmitting}>
            {payload.action === 'edit' ? <T id={'edit'}/> : <T id={'submit'}/>}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

export default withExchangeRatesDialog(ExchangeRateDialog);
