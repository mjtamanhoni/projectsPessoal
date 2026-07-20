object frmPrincipal: TfrmPrincipal
  Left = 0
  Top = 0
  Caption = 'Server - Gestor Financeiro'
  ClientHeight = 599
  ClientWidth = 998
  Color = clBtnFace
  Font.Charset = DEFAULT_CHARSET
  Font.Color = clWindowText
  Font.Height = -13
  Font.Name = 'Segoe UI Emoji'
  Font.Style = []
  Position = poScreenCenter
  OnCreate = FormCreate
  OnShow = FormShow
  TextHeight = 17
  object pnHeader: TPanel
    AlignWithMargins = True
    Left = 3
    Top = 3
    Width = 992
    Height = 41
    Align = alTop
    BevelOuter = bvNone
    TabOrder = 0
    ExplicitWidth = 991
    object lbStatus: TLabel
      AlignWithMargins = True
      Left = 5
      Top = 10
      Width = 982
      Height = 20
      Margins.Left = 5
      Margins.Top = 10
      Margins.Right = 5
      Margins.Bottom = 10
      Align = alTop
      Alignment = taCenter
      Caption = 'Servidor - Gestor Financeiro Pessoal'
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -15
      Font.Name = 'Segoe UI Emoji'
      Font.Style = [fsBold]
      ParentFont = False
      ExplicitWidth = 273
    end
  end
  object pnBody: TPanel
    AlignWithMargins = True
    Left = 3
    Top = 50
    Width = 992
    Height = 499
    Align = alClient
    BevelOuter = bvNone
    TabOrder = 1
    ExplicitWidth = 991
    object TreeView_Log: TTreeView
      AlignWithMargins = True
      Left = 3
      Top = 45
      Width = 986
      Height = 451
      Align = alClient
      Indent = 19
      TabOrder = 0
      ExplicitWidth = 985
    end
    object pnBody_Titulo: TPanel
      AlignWithMargins = True
      Left = 3
      Top = 3
      Width = 986
      Height = 36
      Align = alTop
      BevelOuter = bvNone
      TabOrder = 1
      ExplicitWidth = 985
      object lbFiltro: TLabel
        AlignWithMargins = True
        Left = 3
        Top = 3
        Width = 110
        Height = 30
        Align = alLeft
        Alignment = taRightJustify
        AutoSize = False
        Caption = 'Filtro por per'#237'odo'
        Layout = tlCenter
        ExplicitHeight = 35
      end
      object lbA: TLabel
        AlignWithMargins = True
        Left = 258
        Top = 3
        Width = 10
        Height = 30
        Align = alLeft
        Alignment = taCenter
        AutoSize = False
        Caption = 'a'
        Layout = tlCenter
        ExplicitLeft = 252
        ExplicitHeight = 35
      end
      object DateTimePicker1: TDateTimePicker
        AlignWithMargins = True
        Left = 119
        Top = 3
        Width = 133
        Height = 30
        Align = alLeft
        Date = 46204.000000000000000000
        Time = 0.317144085645850300
        TabOrder = 0
      end
      object DateTimePicker2: TDateTimePicker
        AlignWithMargins = True
        Left = 274
        Top = 3
        Width = 133
        Height = 30
        Align = alLeft
        Date = 46204.000000000000000000
        Time = 0.317144085645850300
        TabOrder = 1
      end
    end
  end
  object pnFooter: TPanel
    AlignWithMargins = True
    Left = 3
    Top = 555
    Width = 992
    Height = 41
    Align = alBottom
    BevelOuter = bvNone
    TabOrder = 2
    ExplicitWidth = 991
    object lbServer_Port_Ativa: TLabel
      AlignWithMargins = True
      Left = 3
      Top = 3
      Width = 104
      Height = 35
      Align = alLeft
      Caption = 'Porta do Servidor'
      Layout = tlCenter
      ExplicitHeight = 17
    end
    object Button2: TButton
      AlignWithMargins = True
      Left = 895
      Top = 3
      Width = 44
      Height = 35
      Cursor = crHandPoint
      Align = alRight
      Caption = #55357#57092
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -19
      Font.Name = 'Segoe UI Emoji'
      Font.Style = []
      ParentFont = False
      TabOrder = 1
      OnClick = Button2Click
      ExplicitLeft = 894
    end
    object Button1: TButton
      AlignWithMargins = True
      Left = 945
      Top = 3
      Width = 44
      Height = 35
      Cursor = crHandPoint
      Align = alRight
      Caption = #55357#57056
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -19
      Font.Name = 'Segoe UI Emoji'
      Font.Style = []
      ParentFont = False
      TabOrder = 0
      OnClick = Button1Click
      ExplicitLeft = 944
    end
  end
end
